'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, Download, Calendar, TrendingUp, TrendingDown, Package, DollarSign,
  FileText, Search, Filter, Loader2, AlertTriangle, User, Clock, Archive
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Modal, Button, FormField, Input, Select } from '@/components/ui/modal'

interface StockReceiveReport {
  id: string
  invoice_number: string
  supplier_name: string
  received_date: string
  total_items: number
  total_amount: number
  received_by: string
  items: {
    product_name: string
    quantity: number
    unit_cost: number
    lot_number: string
  }[]
}

interface UsageReport {
  id: string
  case_number: string
  patient_name: string
  dentist_name: string
  date: string
  items: {
    product_name: string
    category: string
    quantity: number
    cost: number
  }[]
  total_cost: number
}

interface DeadStockItem {
  id: string
  product_name: string
  product_sku: string | null
  category: string
  quantity: number
  last_movement: string | null
  days_inactive: number
  value: number
}

interface Stats {
  totalCases: number
  casesChange: number
  stockValue: number
  stockChange: number
  itemsUsed: number
  usageChange: number
  purchaseValue: number
  purchaseChange: number
}

type ReportTab = 'overview' | 'receive' | 'usage' | 'deadstock'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalCases: 0, casesChange: 0,
    stockValue: 0, stockChange: 0,
    itemsUsed: 0, usageChange: 0,
    purchaseValue: 0, purchaseChange: 0
  })
  
  // Receive Report State
  const [receiveReports, setReceiveReports] = useState<StockReceiveReport[]>([])
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [receiveStartDate, setReceiveStartDate] = useState('')
  const [receiveEndDate, setReceiveEndDate] = useState('')
  const [selectedReceive, setSelectedReceive] = useState<StockReceiveReport | null>(null)
  const [isReceiveDetailOpen, setIsReceiveDetailOpen] = useState(false)
  
  // Usage Report State
  const [usageReports, setUsageReports] = useState<UsageReport[]>([])
  const [usageStartDate, setUsageStartDate] = useState('')
  const [usageEndDate, setUsageEndDate] = useState('')
  const [usageCategory, setUsageCategory] = useState('')
  const [usageDentist, setUsageDentist] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [dentists, setDentists] = useState<{ id: string; full_name: string }[]>([])
  
  // Dead Stock State
  const [deadStockItems, setDeadStockItems] = useState<DeadStockItem[]>([])
  const [deadStockDays, setDeadStockDays] = useState('90')
  
  // Period Filter
  const [period, setPeriod] = useState('this_month')

  useEffect(() => {
    fetchStats()
    fetchMasterData()
    
    // Set default date range
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setReceiveStartDate(startOfMonth.toISOString().split('T')[0])
    setReceiveEndDate(now.toISOString().split('T')[0])
    setUsageStartDate(startOfMonth.toISOString().split('T')[0])
    setUsageEndDate(now.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (activeTab === 'receive') {
      fetchReceiveReports()
    } else if (activeTab === 'usage') {
      fetchUsageReports()
    } else if (activeTab === 'deadstock') {
      fetchDeadStock()
    }
  }, [activeTab, receiveStartDate, receiveEndDate, usageStartDate, usageEndDate, usageCategory, usageDentist, deadStockDays])

  const fetchStats = async () => {
    setLoading(true)
    const supabase = createClient()
    
    // Get current month stats
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()
    
    // Fetch cases count
    const { count: currentCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth)
    
    const { count: lastCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth)
      .lt('created_at', startOfMonth)
    
    // Fetch stock value
    const { data: stockData } = await supabase
      .from('stock_items')
      .select('quantity, unit_cost')
      .eq('status', 'available')
    
    type StockItem = { quantity: number; unit_cost: number | null }
    const typedStockData = stockData as StockItem[] | null
    const stockValue = typedStockData?.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0) || 0
    
    // Fetch items used
    const { data: usageData } = await supabase
      .from('reservations')
      .select('quantity')
      .eq('status', 'used')
      .gte('used_at', startOfMonth)
    
    type UsageItem = { quantity: number }
    const typedUsageData = usageData as UsageItem[] | null
    const itemsUsed = typedUsageData?.reduce((sum, item) => sum + item.quantity, 0) || 0
    
    // Fetch purchase value
    const { data: purchaseData } = await supabase
      .from('purchase_orders')
      .select('total_amount')
      .eq('status', 'received')
      .gte('received_at', startOfMonth)
    
    type PurchaseItem = { total_amount: number }
    const typedPurchaseData = purchaseData as PurchaseItem[] | null
    const purchaseValue = typedPurchaseData?.reduce((sum, item) => sum + item.total_amount, 0) || 0
    
    setStats({
      totalCases: currentCases || 0,
      casesChange: lastCases ? Math.round(((currentCases || 0) - lastCases) / lastCases * 100) : 0,
      stockValue,
      stockChange: -3, // Placeholder
      itemsUsed,
      usageChange: 8, // Placeholder
      purchaseValue,
      purchaseChange: 15, // Placeholder
    })
    
    setLoading(false)
  }

  const fetchMasterData = async () => {
    const supabase = createClient()
    
    // Get dentist role id first
    const roleResult = await supabase.from('roles').select('id').eq('name', 'dentist').single()
    const dentistRoleId = (roleResult.data as { id: string } | null)?.id
    
    const [categoriesRes, dentistsRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('sort_order'),
      supabase.from('profiles').select('id, full_name').eq('role_id', dentistRoleId || ''),
    ])
    
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (dentistsRes.data) setDentists(dentistsRes.data)
  }

  const fetchReceiveReports = async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('stock_receives')
      .select(`
        id,
        invoice_number,
        received_date,
        total_amount,
        supplier:suppliers(name),
        received_by:profiles(full_name),
        items:stock_receive_items(
          quantity,
          unit_cost,
          lot_number,
          product:products(name)
        )
      `)
      .order('received_date', { ascending: false })
    
    if (receiveStartDate) {
      query = query.gte('received_date', receiveStartDate)
    }
    if (receiveEndDate) {
      query = query.lte('received_date', receiveEndDate)
    }
    if (invoiceSearch) {
      query = query.ilike('invoice_number', `%${invoiceSearch}%`)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching receive reports:', error)
      // Use mock data for demo
      setReceiveReports([
        {
          id: '1',
          invoice_number: 'INV-2026-001',
          supplier_name: 'Straumann Thailand',
          received_date: '2026-02-01',
          total_items: 5,
          total_amount: 150000,
          received_by: 'สมศรี จัดการดี',
          items: [
            { product_name: 'Straumann BLT 4.1x10', quantity: 3, unit_cost: 15000, lot_number: 'LOT-2026-A1' },
            { product_name: 'Straumann BLT 4.1x12', quantity: 2, unit_cost: 15000, lot_number: 'LOT-2026-A2' },
          ]
        },
        {
          id: '2',
          invoice_number: 'INV-2026-002',
          supplier_name: 'Nobel Biocare',
          received_date: '2026-02-03',
          total_items: 8,
          total_amount: 280000,
          received_by: 'สมศรี จัดการดี',
          items: [
            { product_name: 'Nobel Active 3.5x10', quantity: 5, unit_cost: 18000, lot_number: 'LOT-NB-001' },
            { product_name: 'Nobel Active 4.3x11.5', quantity: 3, unit_cost: 18000, lot_number: 'LOT-NB-002' },
          ]
        },
      ])
    } else {
      const transformed = (data || []).map((item: any) => ({
        id: item.id,
        invoice_number: item.invoice_number,
        supplier_name: item.supplier?.name || '-',
        received_date: item.received_date,
        total_items: item.items?.length || 0,
        total_amount: item.total_amount || 0,
        received_by: item.received_by?.full_name || '-',
        items: (item.items || []).map((i: any) => ({
          product_name: i.product?.name || '-',
          quantity: i.quantity,
          unit_cost: i.unit_cost,
          lot_number: i.lot_number,
        }))
      }))
      setReceiveReports(transformed)
    }
    
    setLoading(false)
  }

  const fetchUsageReports = async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('cases')
      .select(`
        id,
        case_number,
        scheduled_date,
        patient:patients(full_name),
        dentist:profiles(full_name),
        reservations(
          quantity,
          stock_item:stock_items(
            unit_cost,
            product:products(
              name,
              category:categories(name)
            )
          )
        )
      `)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
    
    if (usageStartDate) {
      query = query.gte('scheduled_date', usageStartDate)
    }
    if (usageEndDate) {
      query = query.lte('scheduled_date', usageEndDate)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching usage reports:', error)
      // Use mock data for demo
      setUsageReports([
        {
          id: '1',
          case_number: 'CASE-2026-001',
          patient_name: 'นายสมชาย ใจดี',
          dentist_name: 'ทพ.วิชัย สุขสวัสดิ์',
          date: '2026-02-01',
          items: [
            { product_name: 'Straumann BLT 4.1x10', category: 'Implant', quantity: 1, cost: 15000 },
            { product_name: 'Bio-Oss 0.5g', category: 'Bone Graft', quantity: 2, cost: 10000 },
          ],
          total_cost: 25000
        },
        {
          id: '2',
          case_number: 'CASE-2026-002',
          patient_name: 'นางสาวสมหญิง รักสุข',
          dentist_name: 'ทพ.สมหญิง รักษาดี',
          date: '2026-02-02',
          items: [
            { product_name: 'Nobel Active 3.5x10', category: 'Implant', quantity: 2, cost: 36000 },
            { product_name: 'Collagen Membrane', category: 'Membrane', quantity: 1, cost: 8000 },
          ],
          total_cost: 44000
        },
      ])
    } else {
      const transformed = (data || []).map((item: any) => {
        const items = (item.reservations || []).map((r: any) => ({
          product_name: r.stock_item?.product?.name || '-',
          category: r.stock_item?.product?.category?.name || '-',
          quantity: r.quantity,
          cost: r.quantity * (r.stock_item?.unit_cost || 0),
        }))
        return {
          id: item.id,
          case_number: item.case_number,
          patient_name: item.patient?.full_name || '-',
          dentist_name: item.dentist?.full_name || '-',
          date: item.scheduled_date,
          items,
          total_cost: items.reduce((sum: number, i: any) => sum + i.cost, 0),
        }
      })
      setUsageReports(transformed)
    }
    
    setLoading(false)
  }

  const fetchDeadStock = async () => {
    setLoading(true)
    const supabase = createClient()
    
    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - parseInt(deadStockDays))
    
    const { data, error } = await supabase
      .from('stock_items')
      .select(`
        id,
        quantity,
        unit_cost,
        last_movement_at,
        product:products(
          name,
          sku,
          category:categories(name)
        )
      `)
      .eq('status', 'available')
      .gt('quantity', 0)
      .or(`last_movement_at.is.null,last_movement_at.lt.${thresholdDate.toISOString()}`)
      .order('last_movement_at', { ascending: true, nullsFirst: true })
    
    if (error) {
      console.error('Error fetching dead stock:', error)
      // Use mock data for demo
      setDeadStockItems([
        {
          id: '1',
          product_name: 'Osstem TS III 3.5x8.5',
          product_sku: 'OSS-TS3-3585',
          category: 'Implant',
          quantity: 5,
          last_movement: '2025-10-15',
          days_inactive: 112,
          value: 30000,
        },
        {
          id: '2',
          product_name: 'Dentium Superline 4.0x10',
          product_sku: 'DEN-SL-4010',
          category: 'Implant',
          quantity: 3,
          last_movement: '2025-09-20',
          days_inactive: 137,
          value: 18000,
        },
        {
          id: '3',
          product_name: 'Bio-Gide 25x25mm',
          product_sku: 'BG-2525',
          category: 'Membrane',
          quantity: 8,
          last_movement: null,
          days_inactive: 180,
          value: 64000,
        },
      ])
    } else {
      const now = new Date()
      const transformed = (data || []).map((item: any) => {
        const lastMovement = item.last_movement_at ? new Date(item.last_movement_at) : null
        const daysInactive = lastMovement 
          ? Math.floor((now.getTime() - lastMovement.getTime()) / (1000 * 60 * 60 * 24))
          : 999
        return {
          id: item.id,
          product_name: item.product?.name || '-',
          product_sku: item.product?.sku,
          category: item.product?.category?.name || '-',
          quantity: item.quantity,
          last_movement: item.last_movement_at?.split('T')[0] || null,
          days_inactive: daysInactive,
          value: item.quantity * (item.unit_cost || 0),
        }
      })
      setDeadStockItems(transformed)
    }
    
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('th-TH')
  }

  const exportToCSV = (data: any[], filename: string) => {
    // Simple CSV export
    const headers = Object.keys(data[0] || {}).join(',')
    const rows = data.map(row => Object.values(row).join(','))
    const csv = [headers, ...rows].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()
  }

  const tabs = [
    { id: 'overview', label: 'ภาพรวม', icon: BarChart3 },
    { id: 'receive', label: 'รายงานรับเข้า', icon: Package },
    { id: 'usage', label: 'การใช้สินค้า', icon: User },
    { id: 'deadstock', label: 'Dead Stock', icon: Archive },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายงาน</h1>
          <p className="text-slate-500 mt-1">วิเคราะห์ข้อมูลและสร้างรายงาน</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">เคสทั้งหมด</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCases}</p>
                </div>
                <div className={`flex items-center gap-1 ${stats.casesChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.casesChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{stats.casesChange >= 0 ? '+' : ''}{stats.casesChange}%</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">มูลค่าสต็อก</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{(stats.stockValue / 1000000).toFixed(1)}M</p>
                </div>
                <div className={`flex items-center gap-1 ${stats.stockChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.stockChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{stats.stockChange >= 0 ? '+' : ''}{stats.stockChange}%</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">ใช้วัสดุ (ชิ้น)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.itemsUsed}</p>
                </div>
                <div className={`flex items-center gap-1 ${stats.usageChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.usageChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{stats.usageChange >= 0 ? '+' : ''}{stats.usageChange}%</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">สั่งซื้อ</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{(stats.purchaseValue / 1000).toFixed(0)}K</p>
                </div>
                <div className={`flex items-center gap-1 ${stats.purchaseChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.purchaseChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{stats.purchaseChange >= 0 ? '+' : ''}{stats.purchaseChange}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Reports */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-4">รายงานด่วน</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: Package, label: 'สินค้าใกล้หมด', description: '8 รายการ', onClick: () => {} },
                { icon: Calendar, label: 'ใกล้หมดอายุ', description: '6 รายการ (30 วัน)', onClick: () => {} },
                { icon: Archive, label: 'Dead Stock', description: `${deadStockItems.length} รายการ`, onClick: () => setActiveTab('deadstock') },
                { icon: BarChart3, label: 'Supplier Performance', description: 'คะแนนเฉลี่ย 4.2/5', onClick: () => {} },
              ].map((report) => (
                <button
                  key={report.label}
                  onClick={report.onClick}
                  className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <report.icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{report.label}</p>
                    <p className="text-sm text-slate-500">{report.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Receive Report Tab */}
      {activeTab === 'receive' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาเลข Invoice..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={receiveStartDate}
                  onChange={(e) => setReceiveStartDate(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={receiveEndDate}
                  onChange={(e) => setReceiveEndDate(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => exportToCSV(receiveReports, 'receive-report')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Receive Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : receiveReports.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>ไม่พบข้อมูลการรับเข้าในช่วงเวลาที่เลือก</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เลข Invoice</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Supplier</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันที่รับ</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวนรายการ</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">มูลค่ารวม</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ผู้รับ</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {receiveReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-indigo-600">{report.invoice_number}</td>
                      <td className="px-4 py-3 text-slate-900">{report.supplier_name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(report.received_date)}</td>
                      <td className="px-4 py-3 text-center text-slate-900">{report.total_items}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(report.total_amount)} ฿</td>
                      <td className="px-4 py-3 text-slate-600">{report.received_by}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedReceive(report); setIsReceiveDetailOpen(true); }}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          ดูรายละเอียด
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Usage Report Tab */}
      {activeTab === 'usage' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={usageStartDate}
                  onChange={(e) => setUsageStartDate(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={usageEndDate}
                  onChange={(e) => setUsageEndDate(e.target.value)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={usageCategory}
                onChange={(e) => setUsageCategory(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">ทุกหมวดหมู่</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <select
                value={usageDentist}
                onChange={(e) => setUsageDentist(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">ทุกทันตแพทย์</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
              <button
                onClick={() => exportToCSV(usageReports, 'usage-report')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Usage Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : usageReports.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>ไม่พบข้อมูลการใช้สินค้าในช่วงเวลาที่เลือก</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เคส</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">คนไข้</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ทันตแพทย์</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">วันที่</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">รายการใช้</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">ต้นทุนรวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {usageReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-indigo-600">{report.case_number}</td>
                      <td className="px-4 py-3 text-slate-900">{report.patient_name}</td>
                      <td className="px-4 py-3 text-slate-600">{report.dentist_name}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(report.date)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {report.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="text-slate-900">{item.product_name}</span>
                              <span className="text-slate-500"> x{item.quantity}</span>
                            </div>
                          ))}
                          {report.items.length > 2 && (
                            <span className="text-xs text-slate-400">+{report.items.length - 2} รายการ</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(report.total_cost)} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {usageReports.length > 0 && (
            <div className="bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600">สรุปต้นทุนรวมในช่วงเวลาที่เลือก</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    {formatCurrency(usageReports.reduce((sum, r) => sum + r.total_cost, 0))} ฿
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-indigo-600">จำนวนเคส</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{usageReports.length}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dead Stock Tab */}
      {activeTab === 'deadstock' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">ไม่มีการเคลื่อนไหวเกิน</span>
                  <select
                    value={deadStockDays}
                    onChange={(e) => setDeadStockDays(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="30">30 วัน</option>
                    <option value="60">60 วัน</option>
                    <option value="90">90 วัน</option>
                    <option value="180">180 วัน</option>
                    <option value="365">1 ปี</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => exportToCSV(deadStockItems, 'dead-stock-report')}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </div>
          </div>

          {/* Warning Banner */}
          {deadStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900">พบสินค้าที่ไม่มีการเคลื่อนไหว {deadStockItems.length} รายการ</h3>
                <p className="text-sm text-amber-700 mt-1">
                  มูลค่ารวม {formatCurrency(deadStockItems.reduce((sum, i) => sum + i.value, 0))} บาท 
                  - พิจารณาจัดโปรโมชัน แลกเปลี่ยนกับบริษัท หรือปรับแผนการสั่งซื้อ
                </p>
              </div>
            </div>
          )}

          {/* Dead Stock Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : deadStockItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Archive className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>ไม่พบสินค้าที่ไม่มีการเคลื่อนไหว</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">สินค้า</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">หมวดหมู่</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">คงเหลือ</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เคลื่อนไหวล่าสุด</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">ไม่เคลื่อนไหว</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">มูลค่า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deadStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{item.product_name}</p>
                        {item.product_sku && (
                          <p className="text-xs text-slate-500">SKU: {item.product_sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.last_movement ? formatDate(item.last_movement) : 'ไม่เคยเคลื่อนไหว'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.days_inactive > 180 
                            ? 'bg-red-100 text-red-700' 
                            : item.days_inactive > 90 
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.days_inactive} วัน
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.value)} ฿</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Receive Detail Modal */}
      <Modal
        isOpen={isReceiveDetailOpen}
        onClose={() => setIsReceiveDetailOpen(false)}
        title={`รายละเอียดการรับเข้า - ${selectedReceive?.invoice_number || ''}`}
        size="lg"
      >
        {selectedReceive && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-500">Supplier</p>
                <p className="font-medium text-slate-900">{selectedReceive.supplier_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">วันที่รับ</p>
                <p className="font-medium text-slate-900">{formatDate(selectedReceive.received_date)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">ผู้รับ</p>
                <p className="font-medium text-slate-900">{selectedReceive.received_by}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2 text-sm font-semibold text-slate-600">สินค้า</th>
                    <th className="text-left px-4 py-2 text-sm font-semibold text-slate-600">LOT</th>
                    <th className="text-center px-4 py-2 text-sm font-semibold text-slate-600">จำนวน</th>
                    <th className="text-right px-4 py-2 text-sm font-semibold text-slate-600">ราคา/หน่วย</th>
                    <th className="text-right px-4 py-2 text-sm font-semibold text-slate-600">รวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedReceive.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium text-slate-900">{item.product_name}</td>
                      <td className="px-4 py-2 text-slate-600">{item.lot_number}</td>
                      <td className="px-4 py-2 text-center text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(item.quantity * item.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold text-slate-900">รวมทั้งสิ้น</td>
                    <td className="px-4 py-2 text-right font-bold text-indigo-600">{formatCurrency(selectedReceive.total_amount)} ฿</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setIsReceiveDetailOpen(false)}>
                ปิด
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
