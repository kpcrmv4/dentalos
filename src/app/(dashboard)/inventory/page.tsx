'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Search, AlertTriangle, Download, Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ReceiveStockForm } from '@/components/forms/receive-stock-form'

interface StockItem {
  id: string
  lot_number: string
  expiry_date: string
  quantity: number
  reserved_quantity: number
  location: string | null
  status: string
  product: {
    id: string
    name: string
    sku: string
    brand: string | null
    size: string | null
    category: string
    reorder_point: number
  }
}

interface Stats {
  total: number
  normal: number
  low: number
  expiring: number
}

interface DashboardStats {
  total_value: number
  items_received_today: number
  items_used_today: number
  turnover_rate: number
  pending_oos_requests: number
}

interface OOSRequest {
  id: string
  case_number: string
  patient_name: string
  product_name: string
  quantity_needed: number
  urgency_level: string
  requested_by_name: string
  requested_at: string
  days_pending: number
}

const statusConfig = {
  normal: { label: 'ปกติ', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'ใกล้หมด', className: 'bg-amber-100 text-amber-700' },
  expiring: { label: 'ใกล้หมดอายุ', className: 'bg-red-100 text-red-700' },
  out: { label: 'หมด', className: 'bg-slate-100 text-slate-700' },
}

const urgencyConfig = {
  critical: { label: 'ด่วนมาก', className: 'bg-red-100 text-red-700', icon: '🚨' },
  high: { label: 'ด่วน', className: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  normal: { label: 'ปกติ', className: 'bg-blue-100 text-blue-700', icon: '📦' },
}

function calculateItemStatus(item: StockItem): 'normal' | 'low' | 'expiring' | 'out' {
  const available = item.quantity - item.reserved_quantity
  const expiryDate = new Date(item.expiry_date)
  const now = new Date()
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (available <= 0) return 'out'
  if (daysUntilExpiry <= 90) return 'expiring'
  if (available <= item.product.reorder_point) return 'low'
  return 'normal'
}

export default function InventoryPage() {
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [inventory, setInventory] = useState<StockItem[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, normal: 0, low: 0, expiring: 0 })
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_value: 0,
    items_received_today: 0,
    items_used_today: 0,
    turnover_rate: 0,
    pending_oos_requests: 0
  })
  const [oosRequests, setOosRequests] = useState<OOSRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showOOSPanel, setShowOOSPanel] = useState(true)

  const fetchInventory = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('stock_items')
      .select(`
        id,
        lot_number,
        expiry_date,
        quantity,
        reserved_quantity,
        location,
        status,
        product:products!inner (
          id,
          name,
          sku,
          brand,
          size,
          category,
          reorder_point
        )
      `)
      .eq('status', 'active')
      .order('expiry_date', { ascending: true })

    if (error) {
      console.error('Error fetching inventory:', error)
      setLoading(false)
      return
    }

    const items = (data || []) as unknown as StockItem[]
    setInventory(items)

    // Calculate stats
    let normal = 0, low = 0, expiring = 0
    items.forEach(item => {
      const status = calculateItemStatus(item)
      if (status === 'normal') normal++
      else if (status === 'low') low++
      else if (status === 'expiring') expiring++
    })

    setStats({
      total: items.length,
      normal,
      low,
      expiring
    })

    setLoading(false)
  }

  const fetchDashboardStats = async () => {
    const supabase = createClient()
    
    // Mock data - in real implementation, would query from database
    setDashboardStats({
      total_value: 2450000,
      items_received_today: 12,
      items_used_today: 8,
      turnover_rate: 15.5,
      pending_oos_requests: 3
    })
  }

  const fetchOOSRequests = async () => {
    const supabase = createClient()
    
    // Call the SQL function to get pending OOS requests
    const { data, error } = await supabase
      .rpc('get_pending_oos_requests')
    
    if (data) {
      setOosRequests(data as OOSRequest[])
    }
  }

  useEffect(() => {
    fetchInventory()
    fetchDashboardStats()
    fetchOOSRequests()
  }, [])

  const handleReceiveSuccess = () => {
    fetchInventory()
    fetchDashboardStats()
  }

  const handleExport = async () => {
    const headers = ['สินค้า', 'SKU', 'ขนาด', 'LOT', 'วันหมดอายุ', 'คงเหลือ', 'จอง', 'ว่าง', 'ตำแหน่ง', 'สถานะ']
    const rows = inventory.map(item => {
      const available = item.quantity - item.reserved_quantity
      const status = calculateItemStatus(item)
      return [
        item.product.name,
        item.product.sku,
        item.product.size || '-',
        item.lot_number,
        item.expiry_date,
        item.quantity,
        item.reserved_quantity,
        available,
        item.location || '-',
        statusConfig[status].label
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handleCreatePO = (requestId: string) => {
    alert(`สร้าง PO สำหรับคำขอ ${requestId} (จะเชื่อมกับหน้า PO ในระบบจริง)`)
  }

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lot_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !categoryFilter || item.product.category === categoryFilter
    const itemStatus = calculateItemStatus(item)
    const matchesStatus = !statusFilter || itemStatus === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สต็อกวัสดุและรากเทียม</h1>
          <p className="text-slate-500 mt-1">จัดการสินค้าคงคลังและติดตาม LOT</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
          <button
            onClick={() => setIsReceiveModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            รับสินค้าเข้า
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {(dashboardStats.total_value / 1000000).toFixed(2)}M
              </p>
              <p className="text-sm text-slate-500">มูลค่าสต็อก</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dashboardStats.items_received_today}</p>
              <p className="text-sm text-slate-500">รับเข้าวันนี้</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dashboardStats.items_used_today}</p>
              <p className="text-sm text-slate-500">ใช้ออกวันนี้</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dashboardStats.turnover_rate}%</p>
              <p className="text-sm text-slate-500">Turnover Rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{dashboardStats.pending_oos_requests}</p>
              <p className="text-sm text-slate-500">คำขอสต็อกหมด</p>
            </div>
          </div>
        </div>
      </div>

      {/* Out-of-Stock Requests Panel */}
      {oosRequests.length > 0 && showOOSPanel && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  🚨 คำขอวัสดุที่หมดจากสต็อก ({oosRequests.length})
                </h3>
                <p className="text-sm text-slate-600">ทันตแพทย์ยืนยันจะใช้วัสดุเหล่านี้ กรุณาดำเนินการสั่งซื้อ</p>
              </div>
            </div>
            <button
              onClick={() => setShowOOSPanel(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {oosRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg p-4 border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        urgencyConfig[request.urgency_level as keyof typeof urgencyConfig].className
                      }`}>
                        {urgencyConfig[request.urgency_level as keyof typeof urgencyConfig].icon}{' '}
                        {urgencyConfig[request.urgency_level as keyof typeof urgencyConfig].label}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        เคส {request.case_number}
                      </span>
                      <span className="text-sm text-slate-500">
                        ({request.patient_name})
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">สินค้า</p>
                        <p className="font-medium text-slate-900">{request.product_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">จำนวน</p>
                        <p className="font-medium text-slate-900">{request.quantity_needed} ชิ้น</p>
                      </div>
                      <div>
                        <p className="text-slate-500">ขอโดย</p>
                        <p className="font-medium text-slate-900">{request.requested_by_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>รอดำเนินการ {request.days_pending} วัน</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleCreatePO(request.id)}
                      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      สร้าง PO
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">รายการทั้งหมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.normal}</p>
              <p className="text-sm text-slate-500">สต็อกปกติ</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.low}</p>
              <p className="text-sm text-slate-500">ใกล้หมด</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.expiring}</p>
              <p className="text-sm text-slate-500">ใกล้หมดอายุ</p>
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
              placeholder="ค้นหาด้วยชื่อสินค้า, SKU, หรือ LOT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">หมวดหมู่ทั้งหมด</option>
            <option value="implant">Implant</option>
            <option value="abutment">Abutment</option>
            <option value="bone_graft">Bone Graft</option>
            <option value="membrane">Membrane</option>
            <option value="surgical_kit">Surgical Kit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="normal">ปกติ</option>
            <option value="low">ใกล้หมด</option>
            <option value="expiring">ใกล้หมดอายุ</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {inventory.length === 0 ? 'ไม่มีสินค้าในคลัง' : 'ไม่พบสินค้าที่ค้นหา'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">LOT / วันหมดอายุ</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">คงเหลือ</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จอง</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">ว่าง</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ตำแหน่ง</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map((item) => {
                const available = item.quantity - item.reserved_quantity
                const status = calculateItemStatus(item)
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.product.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.product.sku} {item.product.size && `• ${item.product.size}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.lot_number}</p>
                        <p className="text-xs text-slate-500">{item.expiry_date}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-900">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-amber-600 font-medium">{item.reserved_quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${available > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusConfig[status].className}`}>
                        {statusConfig[status].label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Receive Stock Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">รับสินค้าเข้าคลัง</h2>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ReceiveStockForm
                onSuccess={() => {
                  setIsReceiveModalOpen(false)
                  handleReceiveSuccess()
                }}
                onCancel={() => setIsReceiveModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
