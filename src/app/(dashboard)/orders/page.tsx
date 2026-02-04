'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Search, Eye, FileText, Truck, Loader2, Send, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateOrderForm } from '@/components/forms/create-order-form'
import { Modal, Button } from '@/components/ui/modal'

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
  }[]
}

interface Stats {
  draft: number
  sent: number
  partial: number
  receivedThisMonth: number
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
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [stats, setStats] = useState<Stats>({ draft: 0, sent: 0, partial: 0, receivedThisMonth: 0 })
  const [loading, setLoading] = useState(true)

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
          received_quantity
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

    // Calculate stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    let draft = 0, sent = 0, partial = 0, receivedThisMonth = 0
    items.forEach(o => {
      if (o.status === 'draft') draft++
      else if (o.status === 'sent') sent++
      else if (o.status === 'partial') partial++
      if (o.status === 'received' && o.received_at && o.received_at >= startOfMonth) receivedThisMonth++
    })

    setStats({ draft, sent, partial, receivedThisMonth })
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
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
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
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
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">รายการ</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">มูลค่า</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันสั่ง</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">คาดว่าจะได้รับ</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig]
                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-indigo-600">{order.po_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{order.supplier.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-600">{order.items.length} รายการ</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-slate-900">
                        {(order.total_amount || 0).toLocaleString('th-TH')} ฿
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {order.ordered_at ? (
                        <span className="text-slate-600">
                          {new Date(order.ordered_at).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.expected_delivery ? (
                        <span className="text-slate-600">
                          {new Date(order.expected_delivery).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.className || 'bg-slate-100 text-slate-700'}`}>
                        {status?.label || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-1 hover:bg-slate-100 rounded"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-5 h-5 text-slate-400" />
                        </button>
                        {order.status === 'draft' && (
                          <button
                            onClick={() => handleSendOrder(order)}
                            className="p-1 hover:bg-indigo-100 rounded"
                            title="ส่งใบสั่งซื้อ"
                          >
                            <Send className="w-5 h-5 text-indigo-500" />
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
        title={`รายละเอียด ${selectedOrder?.po_number || ''}`}
        size="lg"
      >
        <div className="p-6 space-y-4">
          {selectedOrder && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Supplier</p>
                  <p className="font-medium text-slate-900">{selectedOrder.supplier.name}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">สถานะ</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[selectedOrder.status as keyof typeof statusConfig]?.className || 'bg-slate-100'}`}>
                    {statusConfig[selectedOrder.status as keyof typeof statusConfig]?.label || selectedOrder.status}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">มูลค่ารวม</p>
                  <p className="font-medium text-slate-900">{(selectedOrder.total_amount || 0).toLocaleString('th-TH')} ฿</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">จำนวนรายการ</p>
                  <p className="font-medium text-slate-900">{selectedOrder.items.length} รายการ</p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">หมายเหตุ</p>
                  <p className="text-slate-900">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                  ปิด
                </Button>
                {(selectedOrder.status === 'sent' || selectedOrder.status === 'partial') && (
                  <Button onClick={() => handleMarkReceived(selectedOrder)}>
                    <Check className="w-4 h-4 mr-2" />
                    รับของครบแล้ว
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
