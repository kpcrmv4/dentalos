'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

// Static imports for critical above-the-fold icons only
import { 
  Calendar, 
  Package, 
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle
} from 'lucide-react';

// Dynamic imports for icons used in interactive sections
const ChevronLeft = dynamic(() => import('lucide-react').then(mod => mod.ChevronLeft), { ssr: false });
const ChevronRight = dynamic(() => import('lucide-react').then(mod => mod.ChevronRight), { ssr: false });
const List = dynamic(() => import('lucide-react').then(mod => mod.List), { ssr: false });
const LayoutGrid = dynamic(() => import('lucide-react').then(mod => mod.LayoutGrid), { ssr: false });
const TrendingUp = dynamic(() => import('lucide-react').then(mod => mod.TrendingUp), { ssr: false });
const Plus = dynamic(() => import('lucide-react').then(mod => mod.Plus), { ssr: false });
const Eye = dynamic(() => import('lucide-react').then(mod => mod.Eye), { ssr: false });
const CalendarDays = dynamic(() => import('lucide-react').then(mod => mod.CalendarDays), { ssr: false });
const Activity = dynamic(() => import('lucide-react').then(mod => mod.Activity), { ssr: false });
const Clock = dynamic(() => import('lucide-react').then(mod => mod.Clock), { ssr: false });
const User = dynamic(() => import('lucide-react').then(mod => mod.User), { ssr: false });

// Types
interface DentistStats {
  total_cases: number;
  pending_reservation: number;
  ready_cases: number;
  partial_ready_cases: number;
  not_ready_cases: number;
  completed_cases: number;
  today_cases: number;
  tomorrow_cases: number;
  this_week_cases: number;
}

interface NewCase {
  case_id: string;
  patient_name: string;
  patient_hn: string;
  surgery_date: string;
  surgery_time: string;
  treatment_type: string;
  tooth_number: string;
  assigned_at: string;
  days_until_surgery: number;
  has_reservation: boolean;
}

interface ActionCase {
  case_id: string;
  patient_name: string;
  surgery_date: string;
  action_type: string;
  action_description: string;
  priority: string;
  traffic_light: string;
}

interface CalendarCase {
  case_id: string;
  patient_name: string;
  patient_hn: string;
  surgery_date: string;
  surgery_time: string;
  treatment_type: string;
  tooth_number: string;
  status: string;
  traffic_light_status: string;
  reservation_count: number;
  total_items_reserved: number;
  items_ready: number;
}

interface FrequentProduct {
  product_id: string;
  product_name: string;
  product_ref: string;
  product_brand: string;
  category_name: string;
  usage_count: number;
  total_quantity: number;
  last_used: string;
}

interface Performance {
  completed_cases: number;
  total_reservations: number;
  used_as_reserved: number;
  usage_rate: number;
  avg_reservation_lead_time: number;
  oos_requests: number;
}

interface CalendarSummary {
  total_cases: number;
  total_days: number;
  green_cases: number;
  yellow_cases: number;
  red_cases: number;
  cases_by_date: Array<{
    date: string;
    count: number;
    green: number;
    yellow: number;
    red: number;
  }>;
  treatment_types: Array<{
    type: string;
    count: number;
  }>;
}

interface InitialData {
  user: { id: string; email: string | undefined };
  stats: DentistStats | null;
  newCases: NewCase[];
  actionCases: ActionCase[];
  calendarCases: CalendarCase[];
  frequentProducts: FrequentProduct[];
  performance: Performance | null;
  calendarSummary: CalendarSummary | null;
  startDate: string;
  endDate: string;
}

// Memoized sub-components
const StatCard = memo(function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  const bgColor = `bg-${color}-100`;
  const textColor = `text-${color}-600`;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold ${value > 0 ? textColor : ''}`}>{value}</p>
        </div>
      </div>
    </div>
  );
});

const CaseRow = memo(function CaseRow({ 
  caseData, 
  formatDate, 
  formatTime, 
  getTrafficLightColor 
}: { 
  caseData: CalendarCase;
  formatDate: (date: string) => string;
  formatTime: (time: string) => string;
  getTrafficLightColor: (status: string) => string;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{formatDate(caseData.surgery_date)}</td>
      <td className="px-4 py-3 text-sm">{formatTime(caseData.surgery_time)}</td>
      <td className="px-4 py-3">
        <p className="font-medium text-sm">{caseData.patient_name}</p>
        <p className="text-xs text-gray-500">HN: {caseData.patient_hn}</p>
      </td>
      <td className="px-4 py-3 text-sm">{caseData.treatment_type}</td>
      <td className="px-4 py-3 text-sm">{caseData.tooth_number}</td>
      <td className="px-4 py-3 text-center">
        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${getTrafficLightColor(caseData.traffic_light_status)}`} title={caseData.traffic_light_status === 'gray' ? 'ยังไม่ได้จองวัสดุ' : caseData.traffic_light_status === 'green' ? 'วัสดุพร้อม' : caseData.traffic_light_status === 'yellow' ? 'รอวัสดุเข้า' : 'วัสดุไม่พอ'}>
          {caseData.traffic_light_status === 'green' && <CheckCircle className="w-4 h-4 text-white" />}
          {caseData.traffic_light_status === 'yellow' && <AlertTriangle className="w-4 h-4 text-white" />}
          {caseData.traffic_light_status === 'red' && <XCircle className="w-4 h-4 text-white" />}
          {caseData.traffic_light_status === 'gray' && <HelpCircle className="w-4 h-4 text-white" />}
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm">
        {caseData.reservation_count > 0 ? (
          <span className="text-green-600">{caseData.items_ready}/{caseData.total_items_reserved}</span>
        ) : (
          <span className="text-gray-400">ยังไม่จอง</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <a href={`/reservations/new?case_id=${caseData.case_id}`} className="p-1.5 hover:bg-gray-100 rounded inline-block" title="จองวัสดุ">
          <Eye className="w-4 h-4 text-gray-600" />
        </a>
      </td>
    </tr>
  );
});

const TimelineItem = memo(function TimelineItem({ 
  caseData, 
  formatTime, 
  getTrafficLightColor, 
  getTrafficLightBg 
}: { 
  caseData: CalendarCase;
  formatTime: (time: string) => string;
  getTrafficLightColor: (status: string) => string;
  getTrafficLightBg: (status: string) => string;
}) {
  return (
    <div className={`p-4 flex items-center gap-4 ${getTrafficLightBg(caseData.traffic_light_status)}`}>
      <div className="flex-shrink-0 text-center">
        <div className="text-lg font-bold">{formatTime(caseData.surgery_time)}</div>
      </div>
      <div className={`w-1 h-12 rounded-full ${getTrafficLightColor(caseData.traffic_light_status)}`} />
      <div className="flex-grow">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{caseData.patient_name}</span>
          <span className="text-sm text-gray-500">({caseData.patient_hn})</span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {caseData.treatment_type} - ซี่ {caseData.tooth_number}
        </div>
        {caseData.reservation_count > 0 ? (
          <div className="text-sm text-gray-500 mt-1">
            วัสดุ: {caseData.items_ready}/{caseData.total_items_reserved} รายการพร้อม
          </div>
        ) : (
          <div className="text-sm text-orange-500 mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>ยังไม่ได้จองวัสดุ</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <a href={`/reservations/new?case_id=${caseData.case_id}`} className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50">
          {caseData.reservation_count > 0 ? 'ดูรายละเอียด' : 'จองวัสดุ'}
        </a>
      </div>
    </div>
  );
});

// Main Client Component
export function DentistDashboardClient({ initialData }: { initialData: InitialData }) {
  const supabase = createClient();
  
  // State - initialized from server data
  const [stats, setStats] = useState<DentistStats | null>(initialData.stats);
  const [newCases, setNewCases] = useState<NewCase[]>(initialData.newCases);
  const [actionCases, setActionCases] = useState<ActionCase[]>(initialData.actionCases);
  const [calendarCases, setCalendarCases] = useState<CalendarCase[]>(initialData.calendarCases);
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>(initialData.frequentProducts);
  const [performance, setPerformance] = useState<Performance | null>(initialData.performance);
  const [calendarSummary, setCalendarSummary] = useState<CalendarSummary | null>(initialData.calendarSummary);
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [startDate, setStartDate] = useState(initialData.startDate);
  const [endDate, setEndDate] = useState(initialData.endDate);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoized helper functions
  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const formatTime = useCallback((timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  }, []);

  const getTrafficLightColor = useCallback((status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      case 'gray': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  }, []);

  const getTrafficLightBg = useCallback((status: string) => {
    switch (status) {
      case 'green': return 'bg-green-50 border-green-200';
      case 'yellow': return 'bg-yellow-50 border-yellow-200';
      case 'red': return 'bg-red-50 border-red-200';
      case 'gray': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }, []);

  const getPriorityBadge = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Memoized computed values
  const casesByDate = useMemo(() => {
    return calendarCases.reduce((acc, c) => {
      const date = c.surgery_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(c);
      return acc;
    }, {} as Record<string, CalendarCase[]>);
  }, [calendarCases]);

  const sortedDateEntries = useMemo(() => {
    return Object.entries(casesByDate).sort(([a], [b]) => a.localeCompare(b));
  }, [casesByDate]);

  const timelineStats = useMemo(() => {
    return sortedDateEntries.map(([date, cases]) => ({
      date,
      cases,
      green: cases.filter(c => c.traffic_light_status === 'green').length,
      yellow: cases.filter(c => c.traffic_light_status === 'yellow').length,
      red: cases.filter(c => c.traffic_light_status === 'red').length,
      gray: cases.filter(c => c.traffic_light_status === 'gray').length
    }));
  }, [sortedDateEntries]);

  // Refresh data when date range changes
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Use type assertion to bypass strict type checking for RPC calls
      const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
      const [
        statsResult,
        calendarResult,
        summaryResult
      ] = await Promise.all([
        rpcClient.rpc('get_dentist_stats', { 
          p_dentist_id: initialData.user.id,
          p_start_date: startDate,
          p_end_date: endDate
        }),
        rpcClient.rpc('get_dentist_cases_calendar', { 
          p_dentist_id: initialData.user.id,
          p_start_date: startDate,
          p_end_date: endDate
        }),
        rpcClient.rpc('get_calendar_summary', { 
          p_dentist_id: initialData.user.id,
          p_start_date: startDate,
          p_end_date: endDate
        })
      ]);

      if (statsResult.data) setStats(statsResult.data as DentistStats);
      if (calendarResult.data) setCalendarCases(calendarResult.data as CalendarCase[]);
      if (summaryResult.data) setCalendarSummary(summaryResult.data as CalendarSummary);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [supabase, initialData.user.id, startDate, endDate]);

  // Navigate months
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (direction === 'prev') {
      start.setMonth(start.getMonth() - 1);
      end.setMonth(end.getMonth() - 1);
    } else {
      start.setMonth(start.getMonth() + 1);
      end.setMonth(end.getMonth() + 1);
    }
    
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [startDate, endDate]);

  // Effect to refresh when date changes
  const handleDateChange = useCallback((newStart: string, newEnd: string) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    // Trigger refresh after state update
    setTimeout(refreshData, 0);
  }, [refreshData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🦷 Dentist Dashboard
          </h1>
          <p className="text-gray-500">
            ยินดีต้อนรับ, {initialData.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
          {isRefreshing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Calendar} label="เคสทั้งหมด" value={stats?.total_cases || 0} color="blue" />
        <StatCard icon={Package} label="รอจองวัสดุ" value={stats?.pending_reservation || 0} color="orange" />
        <StatCard icon={CheckCircle} label="วัสดุพร้อม" value={stats?.ready_cases || 0} color="green" />
        <StatCard icon={XCircle} label="วัสดุไม่พร้อม" value={stats?.not_ready_cases || 0} color="red" />
      </div>

      {/* New Cases & Action Required */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* New Cases */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">เคสใหม่ที่ได้รับมอบหมาย</h2>
            </div>
            {newCases.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {newCases.length} รายการ
              </span>
            )}
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {newCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มีเคสใหม่
              </div>
            ) : (
              newCases.map((c) => (
                <div key={c.case_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.patient_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(c.surgery_date)} • {c.treatment_type}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        อีก {c.days_until_surgery} วัน
                      </p>
                    </div>
                    <a
                      href={`/reservations/new?case_id=${c.case_id}`}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      จองวัสดุ
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h2 className="font-semibold">ต้องดำเนินการ</h2>
            </div>
            {actionCases.length > 0 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                {actionCases.length} รายการ
              </span>
            )}
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {actionCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ไม่มีรายการที่ต้องดำเนินการ
              </div>
            ) : (
              actionCases.map((c) => (
                <div key={c.case_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getTrafficLightColor(c.traffic_light)}`} />
                      <div>
                        <p className="font-medium">{c.patient_name}</p>
                        <p className="text-sm text-gray-600">{c.action_description}</p>
                        <p className="text-xs text-gray-400">{formatDate(c.surgery_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadge(c.priority)}`}>
                        {c.priority === 'high' ? 'ด่วน' : c.priority === 'medium' ? 'ปานกลาง' : 'ปกติ'}
                      </span>
                      <a
                        href={`/reservations/new?case_id=${c.case_id}`}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        จัดการ
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">ปฏิทินเคส</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Date Range Picker */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e.target.value, endDate)}
                  className="px-3 py-1.5 border rounded-lg text-sm"
                />
                <span className="text-gray-500">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange(startDate, e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm"
                />
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white shadow' : ''
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  ตาราง
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1 ${
                    viewMode === 'timeline' ? 'bg-white shadow' : ''
                  }`}
                >
                  <List className="w-4 h-4" />
                  Timeline
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        {calendarSummary && (
          <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium">
              สรุป: {calendarSummary.total_cases} เคส ใน {calendarSummary.total_days} วัน
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              {calendarSummary.green_cases} พร้อม
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              {calendarSummary.yellow_cases} บางส่วน
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              {calendarSummary.red_cases} ไม่พร้อม
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              {(calendarSummary as { gray_cases?: number }).gray_cases || 0} ยังไม่จอง
            </span>
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">วันที่</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">เวลา</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">คนไข้</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">การรักษา</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">ซี่ฟัน</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">สถานะวัสดุ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">จองแล้ว</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calendarCases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      ไม่มีเคสในช่วงเวลานี้
                    </td>
                  </tr>
                ) : (
                  calendarCases.map((c) => (
                    <CaseRow 
                      key={c.case_id} 
                      caseData={c}
                      formatDate={formatDate}
                      formatTime={formatTime}
                      getTrafficLightColor={getTrafficLightColor}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {timelineStats.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                ไม่มีเคสในช่วงเวลานี้
              </div>
            ) : (
              timelineStats.map(({ date, cases, green, yellow, red, gray }) => (
                <div key={date} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{formatDate(date)}</span>
                      <span className="text-sm text-gray-500">({cases.length} เคส)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {green > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {green}
                        </span>
                      )}
                      {yellow > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          {yellow}
                        </span>
                      )}
                      {red > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          {red}
                        </span>
                      )}
                      {gray > 0 && (
                        <span className="flex items-center gap-1 text-xs">
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                          {gray}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y">
                    {cases.map((c) => (
                      <TimelineItem
                        key={c.case_id}
                        caseData={c}
                        formatTime={formatTime}
                        getTrafficLightColor={getTrafficLightColor}
                        getTrafficLightBg={getTrafficLightBg}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Frequently Used & Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Frequently Used Products */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">วัสดุที่ใช้บ่อย</h2>
          </div>
          <div className="divide-y">
            {frequentProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                ยังไม่มีข้อมูลการใช้วัสดุ
              </div>
            ) : (
              frequentProducts.map((p, index) => (
                <div key={p.product_id} className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{p.product_name}</p>
                    <p className="text-xs text-gray-500">
                      {p.product_brand} • {p.category_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{p.usage_count} ครั้ง</p>
                    <p className="text-xs text-gray-500">{p.total_quantity} ชิ้น</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">ประสิทธิภาพ (เดือนนี้)</h2>
          </div>
          <div className="p-4 space-y-4">
            {performance ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">เคสที่เสร็จสิ้น</span>
                  <span className="font-medium">{performance.completed_cases} เคส</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">การจองวัสดุ</span>
                  <span className="font-medium">{performance.total_reservations} รายการ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ใช้ตามที่จอง</span>
                  <span className="font-medium">{performance.usage_rate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">จองล่วงหน้าเฉลี่ย</span>
                  <span className="font-medium">{performance.avg_reservation_lead_time.toFixed(1)} วัน</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ขอของที่หมดสต็อก</span>
                  <span className={`font-medium ${performance.oos_requests > 0 ? 'text-orange-600' : ''}`}>
                    {performance.oos_requests} ครั้ง
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                ยังไม่มีข้อมูลประสิทธิภาพ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
