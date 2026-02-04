'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';

// Static imports for critical above-the-fold icons
import { Package, Plus, Search, AlertTriangle, Download } from 'lucide-react';
// EmergencyAlert moved to Reservations page

// Dynamic imports for less critical icons
const Loader2 = dynamic(() => import('lucide-react').then(mod => mod.Loader2), { ssr: false });
const TrendingUp = dynamic(() => import('lucide-react').then(mod => mod.TrendingUp), { ssr: false });
const TrendingDown = dynamic(() => import('lucide-react').then(mod => mod.TrendingDown), { ssr: false });
const DollarSign = dynamic(() => import('lucide-react').then(mod => mod.DollarSign), { ssr: false });
const BarChart3 = dynamic(() => import('lucide-react').then(mod => mod.BarChart3), { ssr: false });
const AlertCircle = dynamic(() => import('lucide-react').then(mod => mod.AlertCircle), { ssr: false });
const Clock = dynamic(() => import('lucide-react').then(mod => mod.Clock), { ssr: false });

// Dynamic import for heavy form component
const ReceiveStockForm = dynamic(
  () => import('@/components/forms/receive-stock-form').then(mod => mod.ReceiveStockForm),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-100 h-96 rounded-lg" />
  }
);

// Types
interface StockItem {
  id: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  reserved_quantity: number;
  location: string | null;
  status: string;
  product: {
    id: string;
    name: string;
    sku: string;
    brand: string | null;
    size: string | null;
    category: string;
    reorder_point: number;
  };
}

interface Stats {
  total: number;
  normal: number;
  low: number;
  expiring: number;
}

interface DashboardStats {
  total_value: number;
  items_received_today: number;
  items_used_today: number;
  turnover_rate: number;
  pending_oos_requests: number;
}

interface OOSRequest {
  id: string;
  case_number: string;
  patient_name: string;
  product_name: string;
  quantity_needed: number;
  urgency_level: string;
  requested_by_name: string;
  requested_at: string;
  days_pending: number;
}

interface InitialData {
  inventory: StockItem[];
  stats: Stats;
  oosRequests: OOSRequest[];
  dashboardStats: DashboardStats;
}

// Config objects (memoized at module level)
const statusConfig = {
  normal: { label: 'ปกติ', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'ใกล้หมด', className: 'bg-amber-100 text-amber-700' },
  expiring: { label: 'ใกล้หมดอายุ', className: 'bg-red-100 text-red-700' },
  out: { label: 'หมด', className: 'bg-slate-100 text-slate-700' },
} as const;

const urgencyConfig = {
  critical: { label: 'ด่วนมาก', className: 'bg-red-100 text-red-700', icon: '🚨' },
  high: { label: 'ด่วน', className: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  normal: { label: 'ปกติ', className: 'bg-blue-100 text-blue-700', icon: '📦' },
} as const;

// Memoized stat card component
const StatCard = memo(function StatCard({
  icon: Icon,
  value,
  label,
  bgColor,
  iconColor
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
});

// Memoized inventory row component
const InventoryRow = memo(function InventoryRow({
  item,
  calculateItemStatus
}: {
  item: StockItem;
  calculateItemStatus: (item: StockItem) => keyof typeof statusConfig;
}) {
  const available = item.quantity - item.reserved_quantity;
  const status = calculateItemStatus(item);
  const statusInfo = statusConfig[status];

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-slate-900">{item.product.name}</p>
          <p className="text-sm text-slate-500">{item.product.sku}</p>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-600">{item.product.size || '-'}</td>
      <td className="px-6 py-4 text-slate-600">{item.lot_number}</td>
      <td className="px-6 py-4 text-slate-600">{item.expiry_date}</td>
      <td className="px-6 py-4 text-center text-slate-600">{item.quantity}</td>
      <td className="px-6 py-4 text-center text-slate-600">{item.reserved_quantity}</td>
      <td className="px-6 py-4 text-center font-medium text-slate-900">{available}</td>
      <td className="px-6 py-4 text-slate-600">{item.location || '-'}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
    </tr>
  );
});

// Memoized OOS Request card
const OOSRequestCard = memo(function OOSRequestCard({
  request,
  onCreatePO
}: {
  request: OOSRequest;
  onCreatePO: (id: string) => void;
}) {
  const urgency = urgencyConfig[request.urgency_level as keyof typeof urgencyConfig] || urgencyConfig.normal;

  return (
    <div className="p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${urgency.className}`}>
              {urgency.icon} {urgency.label}
            </span>
            <span className="text-xs text-slate-500">
              รอ {request.days_pending} วัน
            </span>
          </div>
          <p className="font-medium text-slate-900">{request.product_name}</p>
          <p className="text-sm text-slate-600">
            เคส: {request.case_number} • {request.patient_name}
          </p>
          <p className="text-sm text-slate-500">
            ต้องการ: {request.quantity_needed} ชิ้น • ขอโดย: {request.requested_by_name}
          </p>
        </div>
        <button
          onClick={() => onCreatePO(request.id)}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 whitespace-nowrap"
        >
          สร้าง PO
        </button>
      </div>
    </div>
  );
});

// Main Client Component
export function InventoryClient({ initialData }: { initialData: InitialData }) {
  // State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inventory, setInventory] = useState<StockItem[]>(initialData.inventory);
  const [stats, setStats] = useState<Stats>(initialData.stats);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(initialData.dashboardStats);
  const [oosRequests, setOosRequests] = useState<OOSRequest[]>(initialData.oosRequests);
  const [loading, setLoading] = useState(false);
  const [showOOSPanel, setShowOOSPanel] = useState(true);

  // Memoized helper function
  const calculateItemStatus = useCallback((item: StockItem): keyof typeof statusConfig => {
    const available = item.quantity - item.reserved_quantity;
    const expiryDate = new Date(item.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (available <= 0) return 'out';
    if (daysUntilExpiry <= 90) return 'expiring';
    if (available <= item.product.reorder_point) return 'low';
    return 'normal';
  }, []);

  // Memoized filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        item.product.name.toLowerCase().includes(searchLower) ||
        item.product.sku.toLowerCase().includes(searchLower) ||
        item.lot_number.toLowerCase().includes(searchLower);
      const matchesCategory = !categoryFilter || item.product.category === categoryFilter;
      const itemStatus = calculateItemStatus(item);
      const matchesStatus = !statusFilter || itemStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchQuery, categoryFilter, statusFilter, calculateItemStatus]);

  // Memoized unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(inventory.map(item => item.product.category));
    return Array.from(uniqueCategories).sort();
  }, [inventory]);

  // Callbacks
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

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
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
      setLoading(false);
      return;
    }

    const items = (data || []) as unknown as StockItem[];
    setInventory(items);

    // Calculate stats using reduce (single pass)
    const newStats = items.reduce(
      (acc, item) => {
        const status = calculateItemStatus(item);
        acc.total++;
        if (status === 'normal') acc.normal++;
        else if (status === 'low') acc.low++;
        else if (status === 'expiring') acc.expiring++;
        return acc;
      },
      { total: 0, normal: 0, low: 0, expiring: 0 }
    );

    setStats(newStats);
    setLoading(false);
  }, [calculateItemStatus]);

  const handleReceiveSuccess = useCallback(() => {
    fetchInventory();
    setIsReceiveModalOpen(false);
  }, [fetchInventory]);

  const handleExport = useCallback(() => {
    const headers = ['สินค้า', 'SKU', 'ขนาด', 'LOT', 'วันหมดอายุ', 'คงเหลือ', 'จอง', 'ว่าง', 'ตำแหน่ง', 'สถานะ'];
    const rows = filteredInventory.map(item => {
      const available = item.quantity - item.reserved_quantity;
      const status = calculateItemStatus(item);
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
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredInventory, calculateItemStatus]);

  const handleCreatePO = useCallback((requestId: string) => {
    alert(`สร้าง PO สำหรับคำขอ ${requestId} (จะเชื่อมกับหน้า PO ในระบบจริง)`);
  }, []);

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

      {/* Emergency Alert moved to Reservations page */}

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={DollarSign}
          value={`${(dashboardStats.total_value / 1000000).toFixed(2)}M`}
          label="มูลค่าสต็อก"
          bgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />
        <StatCard
          icon={TrendingUp}
          value={dashboardStats.items_received_today}
          label="รับเข้าวันนี้"
          bgColor="bg-green-100"
          iconColor="text-green-600"
        />
        <StatCard
          icon={TrendingDown}
          value={dashboardStats.items_used_today}
          label="ใช้ออกวันนี้"
          bgColor="bg-orange-100"
          iconColor="text-orange-600"
        />
        <StatCard
          icon={BarChart3}
          value={`${dashboardStats.turnover_rate}%`}
          label="Turnover Rate"
          bgColor="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={AlertCircle}
          value={dashboardStats.pending_oos_requests}
          label="คำขอของหมด"
          bgColor="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* OOS Requests Panel */}
      {oosRequests.length > 0 && showOOSPanel && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200">
          <div className="p-4 border-b border-red-100 bg-red-50 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="font-semibold text-red-900">
                คำขอวัสดุที่หมดสต็อก ({oosRequests.length} รายการ)
              </h2>
            </div>
            <button
              onClick={() => setShowOOSPanel(false)}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ซ่อน
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {oosRequests.map((request) => (
              <OOSRequestCard
                key={request.id}
                request={request}
                onCreatePO={handleCreatePO}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          value={stats.total}
          label="รายการทั้งหมด"
          bgColor="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          icon={Package}
          value={stats.normal}
          label="ปกติ"
          bgColor="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={AlertTriangle}
          value={stats.low}
          label="ใกล้หมด"
          bgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={Clock}
          value={stats.expiring}
          label="ใกล้หมดอายุ"
          bgColor="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาสินค้า, SKU, LOT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">ทุกสถานะ</option>
              <option value="normal">ปกติ</option>
              <option value="low">ใกล้หมด</option>
              <option value="expiring">ใกล้หมดอายุ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">สินค้า</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">ขนาด</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">LOT</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">วันหมดอายุ</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600">คงเหลือ</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600">จอง</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-slate-600">ว่าง</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">ตำแหน่ง</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-2 text-slate-500">กำลังโหลด...</p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    calculateItemStatus={calculateItemStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Stock Modal */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">รับสินค้าเข้าคลัง</h2>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ReceiveStockForm isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} onSuccess={handleReceiveSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
