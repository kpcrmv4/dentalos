'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Camera, Check, X, RefreshCw, AlertTriangle, 
  Package, User, Calendar, Clock, Loader2, Upload, Search,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Button, FormField, Input, Select } from '@/components/ui/modal'

interface CaseDetail {
  id: string
  case_number: string
  patient: { full_name: string; hn_number: string }
  dentist: { full_name: string }
  assistant: { full_name: string } | null
  scheduled_date: string
  scheduled_time: string | null
  procedure_type: string | null
  traffic_light: string
  status: string
}

interface Reservation {
  id: string
  quantity: number
  status: string
  stock_item: {
    id: string
    lot_number: string
    expiry_date: string | null
    quantity: number
    reserved_quantity: number
    product: {
      id: string
      name: string
      brand: string | null
      size: string | null
      category: { name: string }
    }
  }
  reserved_by: { full_name: string }
  reserved_at: string
}

interface AvailableStock {
  stock_item_id: string
  lot_number: string
  expiry_date: string | null
  available_quantity: number
  cost_price: number | null
  product_name: string
  is_reserved_by_other: boolean
  reserved_for_case: string | null
}

interface ActionState {
  type: 'use' | 'cancel' | 'swap' | 'steal' | null
  reservation: Reservation | null
}

export default function CaseExecutePage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Action states
  const [actionState, setActionState] = useState<ActionState>({ type: null, reservation: null })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [quantityUsed, setQuantityUsed] = useState(1)
  
  // Swap/Steal states
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([])
  const [selectedNewStock, setSelectedNewStock] = useState<string | null>(null)
  const [newQuantity, setNewQuantity] = useState(1)
  const [searchProduct, setSearchProduct] = useState('')
  const [showStealWarning, setShowStealWarning] = useState(false)
  const [stealTarget, setStealTarget] = useState<AvailableStock | null>(null)
  
  // Add unreserved stock
  const [showAddStock, setShowAddStock] = useState(false)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchCaseDetail()
    fetchReservations()
    fetchAllProducts()
  }, [caseId])

  const fetchCaseDetail = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('cases')
      .select(`
        id, case_number, scheduled_date, scheduled_time, procedure_type, traffic_light, status,
        patient:patients(full_name, hn_number),
        dentist:profiles!cases_dentist_id_fkey(full_name),
        assistant:profiles!cases_assistant_id_fkey(full_name)
      `)
      .eq('id', caseId)
      .single()

    if (error) {
      console.error('Error fetching case:', error)
      // Mock data
      setCaseDetail({
        id: caseId,
        case_number: 'CASE-2026-015',
        patient: { full_name: 'นายสมชาย ใจดี', hn_number: 'HN-001234' },
        dentist: { full_name: 'ทพ.วิชัย สุขสวัสดิ์' },
        assistant: { full_name: 'น.ส.สมหญิง ช่วยดี' },
        scheduled_date: '2026-02-05',
        scheduled_time: '10:00',
        procedure_type: 'Implant Placement',
        traffic_light: 'green',
        status: 'scheduled'
      })
    } else {
      setCaseDetail(data as any)
    }
  }

  const fetchReservations = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id, quantity, status, reserved_at,
        stock_item:stock_items!reservations_stock_item_id_fkey(
          id, lot_number, expiry_date, quantity, reserved_quantity,
          product:products(
            id, name, brand, size,
            category:categories(name)
          )
        ),
        reserved_by:profiles!reservations_reserved_by_fkey(full_name)
      `)
      .eq('case_id', caseId)
      .in('status', ['reserved', 'partial_used'])
      .order('reserved_at', { ascending: true })

    if (error) {
      console.error('Error fetching reservations:', error)
      // Mock data
      setReservations([
        {
          id: '1',
          quantity: 1,
          status: 'reserved',
          stock_item: {
            id: 's1',
            lot_number: 'LOT-2026-A1',
            expiry_date: '2027-12-31',
            quantity: 5,
            reserved_quantity: 2,
            product: {
              id: 'p1',
              name: 'Straumann BLT 4.1x10',
              brand: 'Straumann',
              size: '4.1x10mm',
              category: { name: 'Implant' }
            }
          },
          reserved_by: { full_name: 'ทพ.วิชัย สุขสวัสดิ์' },
          reserved_at: '2026-02-01T10:00:00'
        },
        {
          id: '2',
          quantity: 2,
          status: 'reserved',
          stock_item: {
            id: 's2',
            lot_number: 'LOT-BG-001',
            expiry_date: '2026-06-30',
            quantity: 10,
            reserved_quantity: 3,
            product: {
              id: 'p2',
              name: 'Bio-Oss 0.5g',
              brand: 'Geistlich',
              size: '0.5g',
              category: { name: 'Bone Graft' }
            }
          },
          reserved_by: { full_name: 'ทพ.วิชัย สุขสวัสดิ์' },
          reserved_at: '2026-02-01T10:05:00'
        }
      ])
    } else {
      setReservations(data as any)
    }
    setLoading(false)
  }

  const fetchAllProducts = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, size, category:categories(name)')
      .eq('is_active', true)
      .order('name')
    
    if (data) setAllProducts(data)
  }

  const fetchAvailableStock = async (productId: string, excludeStockId?: string) => {
    const supabase = createClient()
    
    // Get available stock for the product
    const { data: stockData } = await supabase
      .from('stock_items')
      .select(`
        id, lot_number, expiry_date, quantity, reserved_quantity, cost_price,
        product:products(name)
      `)
      .eq('product_id', productId)
      .eq('status', 'active')
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false })

    if (stockData) {
      // Check which items are reserved by other cases
      const stockWithReservations = await Promise.all(
        stockData.map(async (stock: any) => {
          const { data: reservationData } = await supabase
            .from('reservations')
            .select('case_id, cases(case_number)')
            .eq('stock_item_id', stock.id)
            .eq('status', 'reserved')
            .neq('case_id', caseId)
            .limit(1)

          const available = stock.quantity - stock.reserved_quantity
          const isReservedByOther = (reservationData?.length || 0) > 0

          return {
            stock_item_id: stock.id,
            lot_number: stock.lot_number,
            expiry_date: stock.expiry_date,
            available_quantity: available,
            cost_price: stock.cost_price,
            product_name: stock.product?.name || '',
            is_reserved_by_other: isReservedByOther,
            reserved_for_case: isReservedByOther ? (reservationData?.[0] as any)?.cases?.case_number : null
          }
        })
      )

      setAvailableStock(stockWithReservations.filter(s => 
        s.available_quantity > 0 || s.is_reserved_by_other
      ))
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (): Promise<string> => {
    if (!photoFile) throw new Error('No photo selected')
    
    const supabase = createClient()
    const fileName = `${caseId}/${Date.now()}_${photoFile.name}`
    
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, photoFile)

    if (error) {
      console.error('Upload error:', error)
      // Return mock URL for demo
      return `https://placeholder.com/photos/${fileName}`
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const handleUseReservation = async () => {
    if (!actionState.reservation || !photoFile) return
    
    setActionLoading(true)
    try {
      const photoUrl = await uploadPhoto()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (quantityUsed === actionState.reservation.quantity) {
        // Use full quantity
        // @ts-expect-error - RPC function types are defined in database
        await supabase.rpc('use_reserved_stock', {
          p_reservation_id: actionState.reservation.id,
          p_photo_url: photoUrl || null,
          p_user_id: user?.id || null
        })
      } else {
        // Partial use
        // @ts-expect-error - RPC function types are defined in database
        await supabase.rpc('partial_use_reservation', {
          p_reservation_id: actionState.reservation.id,
          p_quantity_used: quantityUsed,
          p_photo_url: photoUrl || null,
          p_reason: reason || 'Partial use',
          p_user_id: user?.id || null
        })
      }

      await fetchReservations()
      await fetchCaseDetail()
      resetActionState()
    } catch (error) {
      console.error('Error using reservation:', error)
      alert('เกิดข้อผิดพลาด: ' + (error as Error).message)
    }
    setActionLoading(false)
  }

  const handleCancelReservation = async () => {
    if (!actionState.reservation || !reason) return
    
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // @ts-expect-error - RPC function types are defined in database
      await supabase.rpc('cancel_reservation', {
        p_reservation_id: actionState.reservation.id,
        p_reason: reason || null,
        p_user_id: user?.id || null
      })

      await fetchReservations()
      await fetchCaseDetail()
      resetActionState()
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      alert('เกิดข้อผิดพลาด: ' + (error as Error).message)
    }
    setActionLoading(false)
  }

  const handleSwapStock = async () => {
    if (!actionState.reservation || !selectedNewStock) return
    
    // Check if selected stock is reserved by another case
    const selectedStockInfo = availableStock.find(s => s.stock_item_id === selectedNewStock)
    if (selectedStockInfo?.is_reserved_by_other) {
      setStealTarget(selectedStockInfo)
      setShowStealWarning(true)
      return
    }

    await performSwap()
  }

  const performSwap = async () => {
    if (!actionState.reservation || !selectedNewStock) return
    
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // @ts-expect-error - RPC function types are defined in database
      await supabase.rpc('swap_reservation_stock', {
        p_reservation_id: actionState.reservation.id,
        p_new_stock_item_id: selectedNewStock,
        p_new_quantity: newQuantity,
        p_reason: reason || 'Stock swap',
        p_user_id: user?.id || null
      })

      await fetchReservations()
      await fetchCaseDetail()
      resetActionState()
      setShowStealWarning(false)
    } catch (error) {
      console.error('Error swapping stock:', error)
      alert('เกิดข้อผิดพลาด: ' + (error as Error).message)
    }
    setActionLoading(false)
  }

  const handleStealConfirm = async () => {
    if (!stealTarget) return
    
    setActionLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Get the reservation to steal from
      const { data: sourceReservation } = await supabase
        .from('reservations')
        .select('id')
        .eq('stock_item_id', stealTarget.stock_item_id)
        .eq('status', 'reserved')
        .neq('case_id', caseId)
        .single() as { data: { id: string } | null }

      if (sourceReservation) {
        // @ts-expect-error - RPC function types are defined in database
        await supabase.rpc('steal_reservation', {
          p_target_case_id: caseId,
          p_source_reservation_id: sourceReservation.id,
          p_quantity: newQuantity,
          p_reason: reason || 'Urgent need - doctor confirmed',
          p_user_id: user?.id || null
        })
      }

      await fetchReservations()
      await fetchCaseDetail()
      resetActionState()
      setShowStealWarning(false)
      setStealTarget(null)
    } catch (error) {
      console.error('Error stealing reservation:', error)
      alert('เกิดข้อผิดพลาด: ' + (error as Error).message)
    }
    setActionLoading(false)
  }

  const handleAddUnreservedStock = async () => {
    if (!selectedNewStock || !photoFile) return
    
    setActionLoading(true)
    try {
      const photoUrl = await uploadPhoto()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // @ts-expect-error - RPC function types are defined in database
      await supabase.rpc('use_unreserved_stock', {
        p_case_id: caseId,
        p_stock_item_id: selectedNewStock,
        p_quantity: newQuantity,
        p_photo_url: photoUrl || null,
        p_reason: reason || 'Additional material needed',
        p_user_id: user?.id || null
      })

      await fetchReservations()
      await fetchCaseDetail()
      setShowAddStock(false)
      resetActionState()
    } catch (error) {
      console.error('Error adding stock:', error)
      alert('เกิดข้อผิดพลาด: ' + (error as Error).message)
    }
    setActionLoading(false)
  }

  const resetActionState = () => {
    setActionState({ type: null, reservation: null })
    setPhotoFile(null)
    setPhotoPreview(null)
    setReason('')
    setQuantityUsed(1)
    setSelectedNewStock(null)
    setNewQuantity(1)
    setAvailableStock([])
  }

  const openSwapModal = (reservation: Reservation) => {
    setActionState({ type: 'swap', reservation })
    fetchAvailableStock(reservation.stock_item.product.id, reservation.stock_item.id)
    setNewQuantity(reservation.quantity)
  }

  const getTrafficLightColor = (light: string) => {
    switch (light) {
      case 'green': return 'bg-emerald-500'
      case 'yellow': return 'bg-amber-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-slate-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading && !caseDetail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">ดำเนินการเคส</h1>
          <p className="text-slate-500">{caseDetail?.case_number}</p>
        </div>
        <div className={`w-4 h-4 rounded-full ${getTrafficLightColor(caseDetail?.traffic_light || '')}`} />
      </div>

      {/* Case Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">คนไข้</p>
              <p className="font-medium text-slate-900">{caseDetail?.patient.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">ทันตแพทย์</p>
              <p className="font-medium text-slate-900">{caseDetail?.dentist.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">วันที่</p>
              <p className="font-medium text-slate-900">{caseDetail?.scheduled_date && formatDate(caseDetail.scheduled_date)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">เวลา</p>
              <p className="font-medium text-slate-900">{caseDetail?.scheduled_time || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">วัสดุที่จองไว้</h2>
          <button
            onClick={() => setShowAddStock(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + เพิ่มวัสดุ
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>ไม่มีวัสดุที่จองไว้</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {reservation.stock_item.product.name}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>LOT: {reservation.stock_item.lot_number}</span>
                      {reservation.stock_item.expiry_date && (
                        <span>EXP: {formatDate(reservation.stock_item.expiry_date)}</span>
                      )}
                      <span className="font-medium text-slate-700">
                        จำนวน: {reservation.quantity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      จองโดย: {reservation.reserved_by.full_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActionState({ type: 'use', reservation })}
                      className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                      title="ใช้"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openSwapModal(reservation)}
                      className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                      title="เปลี่ยน"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActionState({ type: 'cancel', reservation })}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      title="ยกเลิก"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use Modal */}
      <Modal
        isOpen={actionState.type === 'use'}
        onClose={resetActionState}
        title="ยืนยันการใช้วัสดุ"
        size="md"
      >
        {actionState.reservation && (
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-medium text-slate-900">
                {actionState.reservation.stock_item.product.name}
              </p>
              <p className="text-sm text-slate-500">
                LOT: {actionState.reservation.stock_item.lot_number}
              </p>
            </div>

            <FormField label="จำนวนที่ใช้">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={actionState.reservation.quantity}
                  value={quantityUsed}
                  onChange={(e) => setQuantityUsed(parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg"
                />
                <span className="text-slate-500">/ {actionState.reservation.quantity}</span>
              </div>
            </FormField>

            {quantityUsed < actionState.reservation.quantity && (
              <FormField label="เหตุผลที่ใช้ไม่ครบ">
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ระบุเหตุผล..."
                />
              </FormField>
            )}

            <FormField label="ถ่ายรูปหลักฐาน *" required>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <>
                    <Camera className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                    <p className="text-slate-500">คลิกเพื่อถ่ายรูปหรือเลือกไฟล์</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={resetActionState}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleUseReservation}
                disabled={!photoFile || actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันการใช้'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={actionState.type === 'cancel'}
        onClose={resetActionState}
        title="ยกเลิกการจอง"
        size="md"
      >
        {actionState.reservation && (
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">
                คุณกำลังจะยกเลิกการจอง <strong>{actionState.reservation.stock_item.product.name}</strong> จำนวน {actionState.reservation.quantity} ชิ้น
              </p>
            </div>

            <FormField label="เหตุผลในการยกเลิก *" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={resetActionState}>
                ปิด
              </Button>
              <Button 
                variant="danger"
                onClick={handleCancelReservation}
                disabled={!reason || actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันยกเลิก'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Swap Modal */}
      <Modal
        isOpen={actionState.type === 'swap'}
        onClose={resetActionState}
        title="เปลี่ยนวัสดุ"
        size="lg"
      >
        {actionState.reservation && (
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-500">เปลี่ยนจาก:</p>
              <p className="font-medium text-slate-900">
                {actionState.reservation.stock_item.product.name} (LOT: {actionState.reservation.stock_item.lot_number})
              </p>
            </div>

            <FormField label="เลือกวัสดุใหม่">
              {availableStock.length === 0 ? (
                <p className="text-slate-500 py-4">ไม่พบสต็อกที่พร้อมใช้งาน</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableStock.map((stock) => (
                    <div
                      key={stock.stock_item_id}
                      onClick={() => setSelectedNewStock(stock.stock_item_id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedNewStock === stock.stock_item_id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">LOT: {stock.lot_number}</p>
                          <p className="text-sm text-slate-500">
                            EXP: {stock.expiry_date ? formatDate(stock.expiry_date) : '-'} | 
                            พร้อมใช้: {stock.available_quantity} ชิ้น
                          </p>
                        </div>
                        {stock.is_reserved_by_other && (
                          <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">
                            จองโดย {stock.reserved_for_case}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormField>

            <FormField label="จำนวน">
              <input
                type="number"
                min={1}
                value={newQuantity}
                onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg"
              />
            </FormField>

            <FormField label="เหตุผลในการเปลี่ยน">
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผล..."
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={resetActionState}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleSwapStock}
                disabled={!selectedNewStock || actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันเปลี่ยน'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Steal Warning Modal */}
      <Modal
        isOpen={showStealWarning}
        onClose={() => { setShowStealWarning(false); setStealTarget(null); }}
        title="ยืนยันการดึงวัสดุจากเคสอื่น"
        size="md"
      >
        {stealTarget && (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-900">วัสดุนี้ถูกจองโดยเคสอื่นแล้ว</p>
                <p className="text-sm text-amber-700 mt-1">
                  LOT: {stealTarget.lot_number} ถูกจองโดยเคส <strong>{stealTarget.reserved_for_case}</strong>
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  หากดำเนินการต่อ เคสดังกล่าวจะได้รับการแจ้งเตือนและสถานะจะเปลี่ยนเป็นสีแดง
                </p>
              </div>
            </div>

            <FormField label="เหตุผลในการดึงวัสดุ *" required>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ระบุเหตุผลที่จำเป็นต้องใช้..."
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setShowStealWarning(false); setStealTarget(null); }}>
                ยกเลิก
              </Button>
              <Button 
                variant="danger"
                onClick={handleStealConfirm}
                disabled={!reason || actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ยืนยันดึงวัสดุ'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Unreserved Stock Modal */}
      <Modal
        isOpen={showAddStock}
        onClose={() => { setShowAddStock(false); resetActionState(); }}
        title="เพิ่มวัสดุที่ไม่ได้จองไว้"
        size="lg"
      >
        <div className="p-6 space-y-4">
          <FormField label="เลือกสินค้า">
            <Select
              value={selectedProduct || ''}
              onChange={(e) => {
                setSelectedProduct(e.target.value)
                if (e.target.value) {
                  fetchAvailableStock(e.target.value)
                }
              }}
            >
              <option value="">-- เลือกสินค้า --</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size && `(${p.size})`}
                </option>
              ))}
            </Select>
          </FormField>

          {selectedProduct && (
            <FormField label="เลือก LOT">
              {availableStock.length === 0 ? (
                <p className="text-slate-500 py-4">ไม่พบสต็อกที่พร้อมใช้งาน</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableStock.filter(s => s.available_quantity > 0).map((stock) => (
                    <div
                      key={stock.stock_item_id}
                      onClick={() => setSelectedNewStock(stock.stock_item_id)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedNewStock === stock.stock_item_id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-900">LOT: {stock.lot_number}</p>
                      <p className="text-sm text-slate-500">
                        พร้อมใช้: {stock.available_quantity} ชิ้น
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </FormField>
          )}

          <FormField label="จำนวน">
            <input
              type="number"
              min={1}
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 border border-slate-200 rounded-lg"
            />
          </FormField>

          <FormField label="เหตุผล">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลที่ต้องใช้เพิ่ม..."
            />
          </FormField>

          <FormField label="ถ่ายรูปหลักฐาน *" required>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <>
                  <Camera className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">คลิกเพื่อถ่ายรูป</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowAddStock(false); resetActionState(); }}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleAddUnreservedStock}
              disabled={!selectedNewStock || !photoFile || actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'เพิ่มวัสดุ'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
