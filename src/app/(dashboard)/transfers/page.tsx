'use client'

import { useState, useEffect } from 'react'
import { ArrowLeftRight, Plus, Search, ArrowRight, ArrowLeft, RotateCcw, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CreateTransferForm } from '@/components/forms/create-transfer-form'
import { Modal, Button } from '@/components/ui/modal'

interface Transfer {
  id: string
  transfer_number: string
  type: string
  quantity: number
  status: string
  notes: string | null
  due_date: string | null
  borrowed_at: string | null
  returned_at: string | null
  created_at: string
  supplier: {
    id: string
    name: string
  }
  stock_item: {
    id: string
    lot_number: string
    product: {
      name: string
      size: string | null
    }
  }
}

interface Stats {
  borrowed: number
  pendingReturn: number
  exchanging: number
  overdue: number
}

const typeConfig = {
  borrow: { label: 'ยืม', icon: ArrowLeft, className: 'bg-blue-100 text-blue-700' },
  return: { label: 'คืน', icon: ArrowRight, className: 'bg-amber-100 text-amber-700' },
  exchange: { label: 'แลกเปลี่ยน', icon: RotateCcw, className: 'bg-purple-100 text-purple-700' },
}

const statusConfig = {
  pending: { label: 'รอดำเนินการ', className: 'bg-slate-100 text-slate-700' },
  pending_return: { label: 'รอคืน', className: 'bg-amber-100 text-amber-700' },
  in_transit: { label: 'กำลังจัดส่ง', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น', className: 'bg-emerald-100 text-emerald-700' },
}

export default function TransfersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [stats, setStats] = useState<Stats>({ borrowed: 0, pendingReturn: 0, exchanging: 0, overdue: 0 })
  const [loading, setLoading] = useState(true)

  const fetchTransfers = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('transfers')
      .select(`
        id,
        transfer_number,
        type,
        quantity,
        status,
        notes,
        due_date,
        borrowed_at,
        returned_at,
        created_at,
        supplier:suppliers!inner (
          id,
          name
        ),
        stock_item:stock_items!inner (
          id,
          lot_number,
          product:products!inner (
            name,
            size
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transfers:', error)
      setLoading(false)
      return
    }

    const items = (data || []) as unknown as Transfer[]
    setTransfers(items)

    // Calculate stats
    const today = new Date().toISOString().split('T')[0]
    let borrowed = 0, pendingReturn = 0, exchanging = 0, overdue = 0
    items.forEach(t => {
      if (t.type === 'borrow' && t.status !== 'completed') borrowed++
      if (t.status === 'pending_return') pendingReturn++
      if (t.type === 'exchange' && t.status !== 'completed') exchanging++
      if (t.due_date && t.due_date < today && t.status !== 'completed') overdue++
    })

    setStats({ borrowed, pendingReturn, exchanging, overdue })
    setLoading(false)
  }

  useEffect(() => {
    fetchTransfers()
  }, [])

  const handleCreateSuccess = () => {
    fetchTransfers()
  }

  const handleMarkReturned = async (transfer: Transfer) => {
    if (!confirm('ยืนยันว่าคืนของแล้ว?')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('transfers')
      .update({
        status: 'completed',
        returned_at: new Date().toISOString()
      } as never)
      .eq('id', transfer.id)

    if (error) {
      console.error('Error updating transfer:', error)
      alert('เกิดข้อผิดพลาด')
      return
    }

    fetchTransfers()
  }

  const filteredTransfers = transfers.filter((transfer) => {
    const matchesSearch =
      transfer.transfer_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transfer.stock_item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = !typeFilter || transfer.type === typeFilter
    const matchesStatus = !statusFilter || transfer.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ยืม-คืน/แลกเปลี่ยนกับบริษัท</h1>
          <p className="text-slate-500 mt-1">จัดการการยืม คืน และแลกเปลี่ยนสินค้ากับ Supplier</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          สร้างรายการใหม่
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.borrowed}</p>
              <p className="text-sm text-slate-500">ยืมอยู่</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.pendingReturn}</p>
              <p className="text-sm text-slate-500">รอคืน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.exchanging}</p>
              <p className="text-sm text-slate-500">แลกเปลี่ยน</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-sm text-slate-500">เกินกำหนด</p>
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
              placeholder="ค้นหาด้วยเลขรายการ, บริษัท, หรือสินค้า..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">ประเภททั้งหมด</option>
            <option value="borrow">ยืม</option>
            <option value="return">คืน</option>
            <option value="exchange">แลกเปลี่ยน</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="pending_return">รอคืน</option>
            <option value="in_transit">กำลังจัดส่ง</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {transfers.length === 0 ? 'ไม่มีรายการยืม-คืน' : 'ไม่พบรายการที่ค้นหา'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เลขรายการ</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ประเภท</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">บริษัท</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวน</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">กำหนดคืน</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransfers.map((transfer) => {
                const type = typeConfig[transfer.type as keyof typeof typeConfig]
                const status = statusConfig[transfer.status as keyof typeof statusConfig]
                const TypeIcon = type?.icon || ArrowLeftRight
                const today = new Date().toISOString().split('T')[0]
                const isOverdue = transfer.due_date && transfer.due_date < today && transfer.status !== 'completed'

                return (
                  <tr key={transfer.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono font-medium text-indigo-600">{transfer.transfer_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${type?.className || 'bg-slate-100 text-slate-700'}`}
                      >
                        <TypeIcon className="w-3 h-3" />
                        {type?.label || transfer.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{transfer.supplier.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">
                        {transfer.stock_item.product.name}
                        {transfer.stock_item.product.size && ` ${transfer.stock_item.product.size}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-slate-900">{transfer.quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      {transfer.due_date ? (
                        <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                          {new Date(transfer.due_date).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {isOverdue && ' (เกินกำหนด)'}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status?.className || 'bg-slate-100 text-slate-700'}`}>
                        {status?.label || transfer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {transfer.status === 'pending_return' && (
                        <button
                          onClick={() => handleMarkReturned(transfer)}
                          className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                        >
                          <Check className="w-4 h-4 inline mr-1" />
                          คืนแล้ว
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Transfer Modal */}
      <CreateTransferForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}
