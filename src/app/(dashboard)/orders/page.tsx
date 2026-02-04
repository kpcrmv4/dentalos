'use client'

import { useState, useEffect, useMemo } from 'react'
import { ShoppingCart, Plus, Search, Eye, FileText, Truck, Loader2, Send, Check, AlertTriangle, Clock, Package, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateOrderForm } from '@/components/forms/create-order-form'
import { Modal, Button, FormField, Input } from '@/components/ui/modal'

interface PurchaseOrder {
  id: string
  po_number: string
  status: string
  total_amount: number
  notes: string | null
  ordered_at: string | null
  expected_delivery: string | null
  received_at: string | null
  created_at: string
  supplier: {
    id: string
    name: string
  }
  items: {
    id: string
    quantity: number
    received_quantity: number
    product: {
      name: string
      sku: string | null
    }
  }[]
}

interface Stats {
  draft: number
  sent: number
  partial: number
  receivedThisMonth: number
  overdue: number
}

interface OverdueOrder {
  id: string
  po_number: string
  supplier_name: string
  expected_delivery: string
  days_overdue: number
}

const statusConfig = {
  draft: { label: 'ร่าง', className: 'bg-slate-100 text-slate-700' },
  sent: { label: 'ส่งแล้ว', className: 'bg-indigo-100 text-indigo-700' },
  partial: { label: 'รับบางส่วน', className: 'bg-amber-100 text-amber-700' },
  received: { label: 'รับครบแล้ว', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', className: 'bg-red-100 text-red-700' },
}

export default function OrdersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [stats, setStats] = useState<Stats>({ draft: 0, sent: 0, partial: 0, receivedThisMonth: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)
  const [showOverdueAlert, setShowOverdueAlert] = useState(true)
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({})

  const fetchOrders = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        status,
        total_amount,
        notes,
        ordered_at,
        expected_delivery,
        received_at,
        created_at,
        supplier:suppliers!inner (
          id,
          name
        ),
        items:purchase_order_items (
          id,
          quantity,
          received_quantity,
          product:products (
            name,
            sku
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error)
      setLoading(false)
      return
    }

    const items = (data || []) as unknown as PurchaseOrder[]
    setOrders(items)

    // Calculate stats including overdue
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    let draft = 0, sent = 0, partial = 0, receivedThisMonth = 0, overdue = 0
    
    items.forEach(o => {
      if (o.status === 'draft') draft++
      else if (o.status === 'sent') {
        sent++
        // Check if overdue
        if (o.expected_delivery && o.expected_delivery < today) {
          overdue++
        }
      }
      else if (o.status === 'partial') {
        partial++
        // Check if overdue
        if (o.expected_delivery && o.expected_delivery < today) {
          overdue++
        }
      }
      if (o.status === 'received' && o.received_at && o.received_at >= startOfMonth) receivedThisMonth++
    })

    setStats({ draft, sent, partial, receivedThisMonth, overdue })
    setLoading(false)
  }

  const fetchSuppliers = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('suppliers').select('id, name').order('name')
    if (data) setSuppliers(data)
  }

  useEffect(() => {
    fetchOrders()
    fetchSuppliers()
  }, [])

  // Calculate overdue orders
  const overdueOrders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return orders
      .filter(o => (o.status === 'sent' || o.status === 'partial') && o.expected_delivery)
      .map(o => {
        const expectedDate = new Date(o.expected_delivery!)
        expectedDate.setHours(0, 0, 0, 0)
        const diffTime = today.getTime() - expectedDate.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
          id: o.id,
          po_number: o.po_number,
          supplier_name: o.supplier.name,
          expected_delivery: o.expected_delivery!,
          days_overdue: diffDays,
        }
      })
      .filter(o => o.days_overdue > 0)
      .sort((a, b) => b.days_overdue - a.days_overdue)
  }, [orders])

  const handleCreateSuccess = () => {
    fetchOrders()
  }

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    setIsViewModalOpen(true)
  }

  const handleSendOrder = async (order: PurchaseOrder) => {
    if (!confirm('ต้องการส่งใบสั่งซื้อนี้?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'sent',
        ordered_at: new Date().toISOString()
      } as never)
      .eq('id', order.id)

    if (error) {
      console.error('Error sending order:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }

    // Create notification
    await supabase.from('notifications').insert({
      type: 'po_sent',
      title: 'ส่งใบสั่งซื้อแล้ว',
      message: `ใบสั่งซื้อ ${order.po_number} ถูกส่งไปยัง ${order.supplier.name}`,
      data: { po_id: order.id, po_number: order.po_number },
      target_roles: ['inventory', 'admin'],
    } as never)

    fetchOrders()
  }

  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    setSelectedOrder(order)
    // Initialize receive quantities
    const quantities: Record<string, number> = {}
    order.items.forEach(item => {
      quantities[item.id] = item.quantity - item.received_quantity
    })
    setReceiveQuantities(quantities)
    setIsReceiveModalOpen(true)
  }

  const handleReceiveItems = async () => {
    if (!selectedOrder) return

    const supabase = createClient()
    
    // Update each item's received quantity
    for (const item of selectedOrder.items) {
      const receiveQty = receiveQuantities[item.id] || 0
      if (receiveQty > 0) {
        const newReceivedQty = item.received_quantity + receiveQty
        await supabase
          .from('purchase_order_items')
          .update({ received_quantity: newReceivedQty } as never)
          .eq('id', item.id)
      }
    }

    // Check if all items are fully received
    const allReceived = selectedOrder.items.every(item => {
      const receiveQty = receiveQuantities[item.id] || 0
      return (item.received_quantity + receiveQty) >= item.quantity
    })

    const anyReceived = selectedOrder.items.some(item => {
      const receiveQty = receiveQuantities[item.id] || 0
      return (item.received_quantity + receiveQty) > 0
    })

    // Update PO status
    let newStatus = selectedOrder.status
    if (allReceived) {
      newStatus = 'received'
    } else if (anyReceived) {
      newStatus = 'partial'
    }

    await supabase
      .from('purchase_orders')
      .update({
        status: newStatus,
        received_at: allReceived ? new Date().toISOString() : null,
      } as never)
      .eq('id', selectedOrder.id)

    // Create notification
    await supabase.from('notifications').insert({
      type: 'po_received',
      title: allReceived ? 'รับสินค้าครบแล้ว' : 'รับสินค้าบางส่วน',
      message: `ใบสั่งซื้อ ${selectedOrder.po_number} ${allReceived ? 'รับสินค้าครบแล้ว' : 'รับสินค้าบางส่วน'}`,
      data: { po_id: selectedOrder.id, po_number: selectedOrder.po_number },
      target_roles: ['inventory', 'admin'],
    } as never)

    setIsReceiveModalOpen(false)
    setSelectedOrder(null)
    fetchOrders()
  }

  const handleMarkReceived = async (order: PurchaseOrder) => {
    if (!confirm('ต้องการบันทึกว่ารับของครบแล้ว?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'received',
        received_at: new Date().toISOString()
      } as never)
      .eq('id', order.id)

    if (error) {
      console.error('Error marking received:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }

    fetchOrders()
    setIsViewModalOpen(false)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSupplier = !supplierFilter || order.supplier.id === supplierFilter
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesSupplier && matchesStatus
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ใบสั่งซื้อ</h1>
          <p className="text-slate-500 mt-1">จัดการใบสั่งซื้อและติดตามการจัดส่ง</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          สร้างใบสั่งซื้อ
        </button>
      </div>

      {/* Overdue Alert */}
      {showOverdueAlert && overdueOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">มีใบสั่งซื้อเกินกำหนดรับ {overdueOrders.length} รายการ</h3>
                <p className="text-sm text-red-700 mt-1">กรุณาติดตามกับ Supplier เพื่อเร่งรัดการจัดส่ง</p>
                <div className="mt-3 space-y-2">
                  {overdueOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-red-900">{order.po_number}</span>
                      <span className="text-red-700">{order.supplier_name}</span>
                      <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-medium">
                        เกิน {order.days_overdue} วัน
                      </span>
                    </div>
                  ))}
                  {overdueOrders.length > 3 && (
                    <p className="text-sm text-red-600">และอีก {overdueOrders.length - 3} รายการ...</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowOverdueAlert(false)}
              className="text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
              <p className="text-sm text-slate-500">ร่าง</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.sent}</p>
              <p className="text-sm text-slate-500">รอรับของ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.partial}</p>
              <p className="text-sm text-slate-500">รับบางส่วน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-sm text-slate-500">เกินกำหนด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.receivedThisMonth}</p>
              <p className="text-sm text-slate-500">รับครบเดือนนี้</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลข PO หรือชื่อ Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Supplier ทั้งหมด</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="draft">ร่าง</option>
            <option value="sent">ส่งแล้ว</option>
            <option value="partial">รับบางส่วน</option>
            <option value="received">รับครบแล้ว</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {orders.length === 0 ? 'ไม่มีใบสั่งซื้อ' : 'ไม่พบรายการที่ค้นหา'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เลข PO</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Supplier</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">มูลค่า</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">กำหนดรับ</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig]
                const isOverdue = (order.status === 'sent' || order.status === 'partial') && 
                  order.expected_delivery && 
                  new Date(order.expected_delivery) < new Date()
                
                return (
                  <tr key={order.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{order.po_number}</p>
                        {isOverdue && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            เกินกำหนด
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        สร้างเมื่อ {formatDate(order.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{order.supplier.name}</p>
                      <p className="text-sm text-slate-500">{order.items.length} รายการ</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium text-slate-900">
                        {order.total_amount.toLocaleString('th-TH')} ฿
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {formatDate(order.expected_delivery)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status?.className}`}>
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => handleSendOrder(order)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="ส่งใบสั่งซื้อ"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === 'sent' || order.status === 'partial') && (
                          <button
                            onClick={() => handleOpenReceiveModal(order)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="รับสินค้า"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Order Modal */}
      <CreateOrderForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* View Order Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`รายละเอียดใบสั่งซื้อ ${selectedOrder?.po_number || ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500">Supplier</p>
                <p className="font-medium text-slate-900">{selectedOrder.supplier.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">สถานะ</p>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.className}`}>
                  {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label}
                </span>
              </div>
              <div>
                <p className="text-sm text-slate-500">กำหนดรับ</p>
                <p className="font-medium text-slate-900">{formatDate(selectedOrder.expected_delivery)}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 text-sm font-semibold text-slate-600">สินค้า</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">สั่ง</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">รับแล้ว</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">{item.product?.name || 'ไม่ระบุ'}</p>
                        {item.product?.sku && (
                          <p className="text-xs text-slate-500">SKU: {item.product.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-center text-emerald-600">{item.received_quantity}</td>
                      <td className="px-4 py-2 text-center text-amber-600">{item.quantity - item.received_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder.notes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  <strong>หมายเหตุ:</strong> {selectedOrder.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                ปิด
              </Button>
              {(selectedOrder.status === 'sent' || selectedOrder.status === 'partial') && (
                <Button onClick={() => {
                  setIsViewModalOpen(false)
                  handleOpenReceiveModal(selectedOrder)
                }}>
                  รับสินค้า
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Items Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={`รับสินค้า - ${selectedOrder?.po_number || ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="p-6 space-y-4">
            <div className="bg-indigo-50 rounded-lg p-3 flex items-start gap-2">
              <Package className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="text-sm text-indigo-700">
                <p className="font-medium">บันทึกจำนวนสินค้าที่รับจริง</p>
                <p>กรอกจำนวนที่รับในแต่ละรายการ (ค่าเริ่มต้นคือจำนวนที่ยังไม่ได้รับ)</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 text-sm font-semibold text-slate-600">สินค้า</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">สั่ง</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">รับแล้ว</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">รับครั้งนี้</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedOrder.items.map((item) => {
                    const remaining = item.quantity - item.received_quantity
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-2">
                          <p className="font-medium text-slate-900">{item.product?.name || 'ไม่ระบุ'}</p>
                        </td>
                        <td className="px-4 py-2 text-center text-slate-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-center text-emerald-600">{item.received_quantity}</td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            max={remaining}
                            value={receiveQuantities[item.id] || 0}
                            onChange={(e) => setReceiveQuantities({
                              ...receiveQuantities,
                              [item.id]: Math.min(parseInt(e.target.value) || 0, remaining)
                            })}
                            className="w-20 mx-auto text-center"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsReceiveModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleReceiveItems}>
                บันทึกการรับสินค้า
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
