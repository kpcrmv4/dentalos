'use client'

import { useState } from 'react'
import { Package, Plus, Search, AlertTriangle, Download } from 'lucide-react'
import { ReceiveStockForm } from '@/components/forms/receive-stock-form'

// Mock data for inventory
const mockInventory = [
  {
    id: '1',
    product: {
      name: 'Straumann BLT Implant',
      sku: 'STR-BLT-410',
      brand: 'Straumann',
      size: '4.1 x 10mm',
    },
    lot_number: 'LOT-2026-001',
    expiry_date: '2027-06-15',
    quantity: 10,
    reserved_quantity: 3,
    reorder_point: 5,
    location: 'A-01-01',
    status: 'normal',
  },
  {
    id: '2',
    product: {
      name: 'Nobel Active Implant',
      sku: 'NB-ACT-350',
      brand: 'Nobel Biocare',
      size: '3.5 x 10mm',
    },
    lot_number: 'LOT-2026-002',
    expiry_date: '2027-03-20',
    quantity: 4,
    reserved_quantity: 2,
    reorder_point: 5,
    location: 'A-01-02',
    status: 'low',
  },
  {
    id: '3',
    product: {
      name: 'Bio-Oss Bone Graft 0.5g',
      sku: 'BIO-OSS-05',
      brand: 'Geistlich',
      size: '0.5g',
    },
    lot_number: 'LOT-2026-003',
    expiry_date: '2026-04-10',
    quantity: 8,
    reserved_quantity: 0,
    reorder_point: 3,
    location: 'B-02-01',
    status: 'expiring',
  },
  {
    id: '4',
    product: {
      name: 'Osstem TS III Implant',
      sku: 'OSS-TS3-412',
      brand: 'Osstem',
      size: '4.0 x 12mm',
    },
    lot_number: 'LOT-2026-004',
    expiry_date: '2028-01-15',
    quantity: 15,
    reserved_quantity: 5,
    reorder_point: 5,
    location: 'A-02-01',
    status: 'normal',
  },
]

const statusConfig = {
  normal: { label: 'ปกติ', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'ใกล้หมด', className: 'bg-amber-100 text-amber-700' },
  expiring: { label: 'ใกล้หมดอายุ', className: 'bg-red-100 text-red-700' },
  out: { label: 'หมด', className: 'bg-slate-100 text-slate-700' },
}

export default function InventoryPage() {
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleReceiveSuccess = () => {
    alert('รับสินค้าเข้าคลังสำเร็จ!')
  }

  const filteredInventory = mockInventory.filter((item) => {
    const matchesSearch =
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lot_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || item.status === statusFilter
    return matchesSearch && matchesStatus
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
            onClick={() => alert('Export ข้อมูลสต็อก...')}
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
              <p className="text-2xl font-bold text-slate-900">156</p>
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
              <p className="text-2xl font-bold text-slate-900">142</p>
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
              <p className="text-2xl font-bold text-slate-900">8</p>
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
              <p className="text-2xl font-bold text-slate-900">6</p>
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
            <option value="bone-graft">Bone Graft</option>
            <option value="membrane">Membrane</option>
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
              const status = statusConfig[item.status as keyof typeof statusConfig]
              return (
                <tr key={item.id} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.product.name}</p>
                      <p className="text-sm text-slate-500">
                        {item.product.sku} • {item.product.size}
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
                      className={`font-semibold ${available <= item.reorder_point ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {available}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm text-slate-600">{item.location}</span>
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
