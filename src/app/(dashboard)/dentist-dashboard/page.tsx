'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Calendar, 
  Clock, 
  User, 
  Package, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  TrendingUp,
  Plus,
  Eye,
  CalendarDays,
  Activity
} from 'lucide-react';

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
  traffic_light_status: string;
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

export default function DentistDashboardPage() {
  const supabase = createClientComponentClient();
  
  // State
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<DentistStats | null>(null);
  const [newCases, setNewCases] = useState<NewCase[]>([]);
  const [actionCases, setActionCases] = useState<ActionCase[]>([]);
  const [calendarCases, setCalendarCases] = useState<CalendarCase[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [calendarSummary, setCalendarSummary] = useState<CalendarSummary | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Fetch all data in parallel
      const [
        statsResult,
        newCasesResult,
        actionCasesResult,
        calendarResult,
        frequentResult,
        performanceResult,
        summaryResult
      ] = await Promise.all([
        supabase.rpc('get_dentist_stats', { 
          p_dentist_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        }),
        supabase.rpc('get_new_assigned_cases', { 
          p_dentist_id: user.id,
          p_limit: 10
        }),
        supabase.rpc('get_action_required_cases', { 
          p_dentist_id: user.id,
          p_limit: 10
        }),
        supabase.rpc('get_dentist_cases_calendar', { 
          p_dentist_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        }),
        supabase.rpc('get_frequently_used_products', { 
          p_dentist_id: user.id,
          p_limit: 5,
          p_months: 6
        }),
        supabase.rpc('get_dentist_performance', { 
          p_dentist_id: user.id
        }),
        supabase.rpc('get_calendar_summary', { 
          p_dentist_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        })
      ]);

      if (statsResult.data) setStats(statsResult.data);
      if (newCasesResult.data) setNewCases(newCasesResult.data);
      if (actionCasesResult.data) setActionCases(actionCasesResult.data);
      if (calendarResult.data) setCalendarCases(calendarResult.data);
      if (frequentResult.data) setFrequentProducts(frequentResult.data);
      if (performanceResult.data) setPerformance(performanceResult.data);
      if (summaryResult.data) setCalendarSummary(summaryResult.data);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  const getTrafficLightColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getTrafficLightBg = (status: string) => {
    switch (status) {
      case 'green': return 'bg-green-50 border-green-200';
      case 'yellow': return 'bg-yellow-50 border-yellow-200';
      case 'red': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
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
  };

  // Group cases by date for timeline
  const casesByDate = calendarCases.reduce((acc, c) => {
    const date = c.surgery_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(c);
    return acc;
  }, {} as Record<string, CalendarCase[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🦷 Dentist Dashboard
          </h1>
          <p className="text-gray-500">
            ยินดีต้อนรับ, {currentUser?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {formatDate(startDate)} - {formatDate(endDate)}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">เคสทั้งหมด</p>
              <p className="text-2xl font-bold">{stats?.total_cases || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">รอจองวัสดุ</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.pending_reservation || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">วัสดุพร้อม</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.ready_cases || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ไม่พร้อม</p>
              <p className="text-2xl font-bold text-red-600">
                {(stats?.partial_ready_cases || 0) + (stats?.not_ready_cases || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">วันนี้</p>
          <p className="text-3xl font-bold">{stats?.today_cases || 0} เคส</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">พรุ่งนี้</p>
          <p className="text-3xl font-bold">{stats?.tomorrow_cases || 0} เคส</p>
        </div>
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-80">สัปดาห์นี้</p>
          <p className="text-3xl font-bold">{stats?.this_week_cases || 0} เคส</p>
        </div>
      </div>

      {/* New Cases & Action Required */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* New Cases */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold">เคสใหม่ที่ได้รับ</h2>
              {newCases.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {newCases.length}
                </span>
              )}
            </div>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {newCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>ไม่มีเคสใหม่ที่รอจองวัสดุ</p>
              </div>
            ) : (
              newCases.map((c) => (
                <div key={c.case_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{c.patient_name}</p>
                      <p className="text-sm text-gray-500">HN: {c.patient_hn}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(c.surgery_date)}</span>
                        <Clock className="w-4 h-4 text-gray-400 ml-2" />
                        <span>{formatTime(c.surgery_time)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {c.treatment_type} - ซี่ {c.tooth_number}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {c.days_until_surgery <= 3 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                          อีก {c.days_until_surgery} วัน
                        </span>
                      )}
                      <a
                        href={`/reservations/new?case_id=${c.case_id}`}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        จองวัสดุ
                      </a>
                    </div>
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
              {actionCases.length > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {actionCases.length}
                </span>
              )}
            </div>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {actionCases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>ไม่มีรายการที่ต้องดำเนินการ</p>
              </div>
            ) : (
              actionCases.map((c) => (
                <div key={c.case_id} className={`p-4 ${getTrafficLightBg(c.traffic_light_status)}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getTrafficLightColor(c.traffic_light_status)}`} />
                        <p className="font-medium">{c.patient_name}</p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {c.action_description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{formatDate(c.surgery_date)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityBadge(c.priority)}`}>
                        {c.priority === 'high' ? 'ด่วน' : c.priority === 'medium' ? 'ปานกลาง' : 'ปกติ'}
                      </span>
                      <a
                        href={`/cases/${c.case_id}`}
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                      >
                        ดูรายละเอียด
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
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-sm"
                />
                <span className="text-gray-500">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                    <tr key={c.case_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(c.surgery_date)}</td>
                      <td className="px-4 py-3 text-sm">{formatTime(c.surgery_time)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sm">{c.patient_name}</p>
                        <p className="text-xs text-gray-500">HN: {c.patient_hn}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{c.treatment_type}</td>
                      <td className="px-4 py-3 text-sm">{c.tooth_number}</td>
                      <td className="px-4 py-3 text-center">
                        <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${getTrafficLightColor(c.traffic_light_status)}`}>
                          {c.traffic_light_status === 'green' && <CheckCircle className="w-4 h-4 text-white" />}
                          {c.traffic_light_status === 'yellow' && <AlertTriangle className="w-4 h-4 text-white" />}
                          {c.traffic_light_status === 'red' && <XCircle className="w-4 h-4 text-white" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {c.reservation_count > 0 ? (
                          <span className="text-green-600">{c.items_ready}/{c.total_items_reserved}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`/cases/${c.case_id}`}
                          className="p-1.5 hover:bg-gray-100 rounded inline-block"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {Object.keys(casesByDate).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                ไม่มีเคสในช่วงเวลานี้
              </div>
            ) : (
              Object.entries(casesByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, cases]) => (
                  <div key={date} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{formatDate(date)}</span>
                        <span className="text-sm text-gray-500">({cases.length} เคส)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {cases.filter(c => c.traffic_light_status === 'green').length > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            {cases.filter(c => c.traffic_light_status === 'green').length}
                          </span>
                        )}
                        {cases.filter(c => c.traffic_light_status === 'yellow').length > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            {cases.filter(c => c.traffic_light_status === 'yellow').length}
                          </span>
                        )}
                        {cases.filter(c => c.traffic_light_status === 'red').length > 0 && (
                          <span className="flex items-center gap-1 text-xs">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            {cases.filter(c => c.traffic_light_status === 'red').length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="divide-y">
                      {cases.map((c) => (
                        <div 
                          key={c.case_id} 
                          className={`p-4 flex items-center gap-4 ${getTrafficLightBg(c.traffic_light_status)}`}
                        >
                          <div className="flex-shrink-0 text-center">
                            <div className="text-lg font-bold">{formatTime(c.surgery_time)}</div>
                          </div>
                          <div className={`w-1 h-12 rounded-full ${getTrafficLightColor(c.traffic_light_status)}`} />
                          <div className="flex-grow">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">{c.patient_name}</span>
                              <span className="text-sm text-gray-500">({c.patient_hn})</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {c.treatment_type} - ซี่ {c.tooth_number}
                            </div>
                            {c.reservation_count > 0 && (
                              <div className="text-sm text-gray-500 mt-1">
                                วัสดุ: {c.items_ready}/{c.total_items_reserved} รายการพร้อม
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <a
                              href={`/cases/${c.case_id}`}
                              className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-50"
                            >
                              ดูรายละเอียด
                            </a>
                          </div>
                        </div>
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
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium">{p.product_name}</p>
                    <p className="text-sm text-gray-500">
                      {p.product_brand} | REF: {p.product_ref}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{p.usage_count} ครั้ง</p>
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
            <Activity className="w-5 h-5 text-green-600" />
            <h2 className="font-semibold">ประสิทธิภาพ (3 เดือนล่าสุด)</h2>
          </div>
          <div className="p-4 space-y-4">
            {performance ? (
              <>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">เคสที่ทำสำเร็จ</span>
                  <span className="text-2xl font-bold text-green-600">
                    {performance.completed_cases}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-gray-600">อัตราใช้วัสดุตามที่จอง</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {performance.usage_rate || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-gray-600">จองวัสดุล่วงหน้าเฉลี่ย</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {performance.avg_reservation_lead_time || 0} วัน
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-gray-600">คำขอวัสดุหมดสต็อก</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {performance.oos_requests}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                ยังไม่มีข้อมูลประสิทธิภาพ
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
