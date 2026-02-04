'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Search, AlertTriangle, Download, Loader2 } from 'lucide-react'
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

const statusConfig = {
  normal: { label: 'ปกติ', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'ใกล้หมด', className: 'bg-amber-100 text-amber-700' },
  expiring: { label: 'ใกล้หมดอายุ', className: 'bg-red-100 text-red-700' },
  out: { label: 'หมด', className: 'bg-slate-100 text-slate-700' },
}

function calculateItemStatus(item: StockItem): 'normal' | 'low' | 'expiring' | 'out' {
  const available = item.quantity - item.reserved_quantity
  const expiryDate = new Date(item.expiry_date)
  const now = new Date()
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Check if out of stock
  if (available <= 0) return 'out'

  // Check if expiring within 90 days
  if (daysUntilExpiry <= 90) return 'expiring'

  // Check if below reorder point
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
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleReceiveSuccess = () => {
    fetchInventory()
  }

  const handleExport = async () => {
    // Create CSV content
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

      {/* Stats Cards */}
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
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map((item) => {
                const available = item.quantity - item.reserved_quantity
                const itemStatus = calculateItemStatus(item)
                const status = statusConfig[itemStatus]
                return (
                  <tr key={item.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{item.product.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.product.sku} {item.product.size ? `• ${item.product.size}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-mono text-sm text-slate-900">{item.lot_number}</p>
                        <p className="text-sm text-slate-500">
                          หมดอายุ: {new Date(item.expiry_date).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-slate-900">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-600">{item.reserved_quantity}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold ${available <= item.product.reorder_point ? 'text-red-600' : 'text-emerald-600'}`}
                      >
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-slate-600">{item.location || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
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
      <ReceiveStockForm
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onSuccess={handleReceiveSuccess}
      />
    </div>
  )
}
