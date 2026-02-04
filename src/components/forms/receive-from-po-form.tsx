'use client'

import { useState, useEffect } from 'react'
import { Modal, FormField, Input, Button } from '@/components/ui/modal'
import { Package, CheckCircle, AlertCircle, Truck, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ReceiveFromPOFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface PurchaseOrder {
  id: string
  po_number: string
  order_date: string
  expected_delivery_date: string
  status: string
  supplier_name: string
  supplier_code: string
  total_items: number
  received_items: number
  total_quantity_ordered: number
  total_quantity_received: number
  total: number
  delivery_status: string
}

interface POItem {
  po_item_id: string
  product_id: string
  product_name: string
  product_ref_code: string
  product_brand: string
  product_size: string
  quantity_ordered: number
  quantity_received: number
  quantity_pending: number
  unit_price: number
  has_expiry: boolean
}

interface ReceiveItem {
  po_item_id: string
  product_name: string
  quantity_pending: number
  lot_number: string
  expiry_date: string
  quantity_received: number
  location: string
  cost_price: string
  has_expiry: boolean
}

export function ReceiveFromPOForm({ isOpen, onClose, onSuccess }: ReceiveFromPOFormProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select_po' | 'receive_items'>('select_po')
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([])
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [poItems, setPOItems] = useState<POItem[]>([])
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')

  // Fetch pending POs
  useEffect(() => {
    const fetchPendingPOs = async () => {
      if (!isOpen) return
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('pending_purchase_orders')
        .select('*')
      
      if (data) {
        setPendingPOs(data)
      }
    }
    
    fetchPendingPOs()
  }, [isOpen])

  // Fetch PO items when PO is selected
  const handleSelectPO = async (po: PurchaseOrder) => {
    setSelectedPO(po)
    setLoading(true)
    
    try {
      const supabase = createClient()
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }
      const { data, error } = await rpcClient.rpc('get_po_items_for_receive', {
        p_po_id: po.id
      })
      
      if (error) throw error
      
      const typedData = (data || []) as POItem[]
      setPOItems(typedData)
      
      // Initialize receive items
      const items: ReceiveItem[] = typedData.map((item: POItem) => ({
        po_item_id: item.po_item_id,
        product_name: item.product_name,
        quantity_pending: item.quantity_pending,
        lot_number: '',
        expiry_date: '',
        quantity_received: item.quantity_pending,
        location: '',
        cost_price: item.unit_price?.toString() || '',
        has_expiry: item.has_expiry
      }))
      
      setReceiveItems(items)
      setStep('receive_items')
    } catch (error) {
      console.error('Error fetching PO items:', error)
      alert('เกิดข้อผิดพลาดในการโหลดรายการสินค้า')
    } finally {
      setLoading(false)
    }
  }

  const handleReceiveItemChange = (index: number, field: keyof ReceiveItem, value: any) => {
    const newItems = [...receiveItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setReceiveItems(newItems)
  }

  const handleSubmit = async () => {
    if (!selectedPO) return
    
    // Validate
    for (const item of receiveItems) {
      if (!item.lot_number) {
        alert('กรุณากรอก LOT Number ทุกรายการ')
        return
      }
      if (item.has_expiry && !item.expiry_date) {
        alert('กรุณากรอกวันหมดอายุสำหรับสินค้าที่มีวันหมดอายุ')
        return
      }
      if (item.quantity_received <= 0) {
        alert('จำนวนที่รับต้องมากกว่า 0')
        return
      }
      if (item.quantity_received > item.quantity_pending) {
        alert(`จำนวนที่รับ (${item.quantity_received}) มากกว่าจำนวนที่สั่ง (${item.quantity_pending})`)
        return
      }
    }
    
    setLoading(true)
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Prepare items for function
      const items = receiveItems.map(item => ({
        po_item_id: item.po_item_id,
        lot_number: item.lot_number,
        expiry_date: item.has_expiry ? item.expiry_date : null,
        quantity_received: item.quantity_received,
        location: item.location || 'คลังหลัก',
        cost_price: parseFloat(item.cost_price) || null
      }))
      
      // Call receive_from_purchase_order function
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: { success: boolean; items_received: number; allocation_results: { allocated_count: number }[]; error?: string } | null; error: unknown }> }
      const { data, error } = await rpcClient.rpc('receive_from_purchase_order', {
        p_po_id: selectedPO.id,
        p_received_by: user.id,
        p_invoice_number: invoiceNumber || null,
        p_items: items
      })
      
      if (error) throw error
      
      if (data?.success) {
        alert(`✅ รับของเข้าคลังสำเร็จ!\n\nPO: ${selectedPO.po_number}\nรับเข้า: ${data.items_received} รายการ\nจัดสรรเข้ารายการจอง: ${data.allocation_results?.filter((r: any) => r.allocated_count > 0).length || 0} รายการ`)
        onSuccess()
        handleClose()
      } else {
        throw new Error(data?.error || 'Unknown error')
      }
    } catch (error: any) {
      console.error('Error receiving from PO:', error)
      alert(`เกิดข้อผิดพลาด: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('select_po')
    setSelectedPO(null)
    setPOItems([])
    setReceiveItems([])
    setInvoiceNumber('')
    onClose()
  }

  const getDeliveryStatusBadge = (status: string) => {
    const badges = {
      overdue: { color: 'bg-red-100 text-red-700', text: 'เกินกำหนด' },
      today: { color: 'bg-orange-100 text-orange-700', text: 'วันนี้' },
      soon: { color: 'bg-yellow-100 text-yellow-700', text: 'ใกล้ถึง' },
      normal: { color: 'bg-blue-100 text-blue-700', text: 'ปกติ' }
    }
    const badge = badges[status as keyof typeof badges] || badges.normal
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.text}</span>
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'select_po' ? 'เลือก PO ที่จะรับของ' : `รับของจาก PO: ${selectedPO?.po_number}`}
      size="xl"
    >
      {step === 'select_po' ? (
        <div className="space-y-4">
          {pendingPOs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>ไม่มี PO ที่รอรับของ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPOs.map((po) => (
                <button
                  key={po.id}
                  onClick={() => handleSelectPO(po)}
                  className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{po.po_number}</span>
                        {getDeliveryStatusBadge(po.delivery_status)}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>{po.supplier_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>กำหนดส่ง: {new Date(po.expected_delivery_date).toLocaleDateString('th-TH')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">
                        รับแล้ว {po.received_items}/{po.total_items} รายการ
                      </div>
                      <div className="text-sm text-slate-600">
                        {po.total_quantity_received}/{po.total_quantity_ordered} ชิ้น
                      </div>
                      <div className="font-semibold text-blue-600 mt-1">
                        ฿{po.total?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FormField label="เลขที่ใบส่งของ (Invoice)">
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-2024-001"
            />
          </FormField>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">สินค้า</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">คงเหลือ</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">LOT</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">วันหมดอายุ</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-slate-700">รับเข้า</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700">ตำแหน่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receiveItems.map((item, index) => (
                  <tr key={item.po_item_id}>
                    <td className="px-4 py-2 text-sm">{item.product_name}</td>
                    <td className="px-4 py-2 text-sm text-center">{item.quantity_pending}</td>
                    <td className="px-4 py-2">
                      <Input
                        value={item.lot_number}
                        onChange={(e) => handleReceiveItemChange(index, 'lot_number', e.target.value)}
                        placeholder="LOT123"
                        className="text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {item.has_expiry ? (
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => handleReceiveItemChange(index, 'expiry_date', e.target.value)}
                          className="text-sm"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">ไม่มี</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        value={item.quantity_received}
                        onChange={(e) => handleReceiveItemChange(index, 'quantity_received', parseInt(e.target.value) || 0)}
                        min={1}
                        max={item.quantity_pending}
                        className="text-sm w-20"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={item.location}
                        onChange={(e) => handleReceiveItemChange(index, 'location', e.target.value)}
                        placeholder="คลังหลัก"
                        className="text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-slate-200">
            <Button
              variant="secondary"
              onClick={() => setStep('select_po')}
              disabled={loading}
            >
              ย้อนกลับ
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันรับของเข้า'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
