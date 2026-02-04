import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DentistDashboardClient } from './client';
import { DentistDashboardSkeleton } from './loading';

// Type definitions
type DentistStats = {
  total_cases: number;
  pending_reservation: number;
  ready_cases: number;
  partial_ready_cases: number;
  not_ready_cases: number;
  completed_cases: number;
  today_cases: number;
  tomorrow_cases: number;
  this_week_cases: number;
};
type NewCase = {
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
};
type ActionCase = {
  case_id: string;
  patient_name: string;
  surgery_date: string;
  action_type: string;
  action_description: string;
  priority: string;
  traffic_light: string;
};
type CalendarCase = {
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
};
type FrequentProduct = {
  product_id: string;
  product_name: string;
  product_ref: string;
  product_brand: string;
  category_name: string;
  usage_count: number;
  total_quantity: number;
  last_used: string;
};
type Performance = {
  completed_cases: number;
  total_reservations: number;
  used_as_reserved: number;
  usage_rate: number;
  avg_reservation_lead_time: number;
  oos_requests: number;
};
type CalendarSummary = {
  total_cases: number;
  total_days: number;
  green_cases: number;
  yellow_cases: number;
  red_cases: number;
  gray_cases: number;
  cases_by_date: Array<{ date: string; count: number; green: number; yellow: number; red: number; gray: number; }>;
  treatment_types: Array<{ type: string; count: number; }>;
};

// Server Component - Fetches initial data
export default async function DentistDashboardPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">กรุณาเข้าสู่ระบบ</p>
      </div>
    );
  }

  // Get initial date range (current month)
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  // Direct query for calendar cases (fallback if RPC doesn't work)
  const { data: casesData, error: casesError } = await supabase
    .from('cases')
    .select(`
      id,
      case_number,
      scheduled_date,
      scheduled_time,
      procedure_type,
      tooth_number,
      status,
      traffic_light,
      patient:patients!cases_patient_id_fkey(full_name, hn_number),
      dentist:profiles!cases_dentist_id_fkey(full_name)
    `)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .neq('status', 'cancelled')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true, nullsFirst: false });

  // Debug: Log query results
  console.log('Dentist Dashboard - Query params:', { startDate, endDate });
  console.log('Dentist Dashboard - Cases found:', casesData?.length || 0);
  
  if (casesError) {
    console.error('Error fetching cases:', casesError);
  }

  // Transform cases data to CalendarCase format
  const calendarCases: CalendarCase[] = (casesData || []).map((c: {
    id: string;
    case_number: string;
    scheduled_date: string;
    scheduled_time: string | null;
    procedure_type: string | null;
    tooth_number: string | null;
    status: string;
    traffic_light: string | null;
    patient: { full_name: string; hn_number: string } | null;
    dentist: { full_name: string } | null;
  }) => ({
    case_id: c.id,
    patient_name: c.patient?.full_name || 'ไม่ระบุ',
    patient_hn: c.patient?.hn_number || '-',
    surgery_date: c.scheduled_date,
    surgery_time: c.scheduled_time || '',
    treatment_type: c.procedure_type || '-',
    tooth_number: c.tooth_number || '-',
    status: c.status,
    traffic_light_status: c.traffic_light || 'gray',
    reservation_count: 0,
    total_items_reserved: 0,
    items_ready: 0
  }));

  // Get reservation counts for each case
  if (calendarCases.length > 0) {
    const caseIds = calendarCases.map(c => c.case_id);
    const { data: reservationsData } = await supabase
      .from('reservations')
      .select('case_id, quantity, status')
      .in('case_id', caseIds);

    if (reservationsData) {
      const reservationsByCase = reservationsData.reduce((acc: Record<string, { count: number; total: number; ready: number }>, r: { case_id: string; quantity: number; status: string }) => {
        if (!acc[r.case_id]) {
          acc[r.case_id] = { count: 0, total: 0, ready: 0 };
        }
        acc[r.case_id].count++;
        acc[r.case_id].total += r.quantity;
        if (r.status === 'reserved') {
          acc[r.case_id].ready += r.quantity;
        }
        return acc;
      }, {});

      calendarCases.forEach(c => {
        const res = reservationsByCase[c.case_id];
        if (res) {
          c.reservation_count = res.count;
          c.total_items_reserved = res.total;
          c.items_ready = res.ready;
        }
      });
    }
  }

  // Calculate stats from cases data
  const stats: DentistStats = {
    total_cases: calendarCases.length,
    pending_reservation: calendarCases.filter(c => c.traffic_light_status === 'gray' || c.reservation_count === 0).length,
    ready_cases: calendarCases.filter(c => c.traffic_light_status === 'green').length,
    partial_ready_cases: calendarCases.filter(c => c.traffic_light_status === 'yellow').length,
    not_ready_cases: calendarCases.filter(c => c.traffic_light_status === 'red').length,
    completed_cases: calendarCases.filter(c => c.status === 'completed').length,
    today_cases: calendarCases.filter(c => c.surgery_date === today.toISOString().split('T')[0]).length,
    tomorrow_cases: calendarCases.filter(c => {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return c.surgery_date === tomorrow.toISOString().split('T')[0];
    }).length,
    this_week_cases: calendarCases.filter(c => {
      const caseDate = new Date(c.surgery_date);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return caseDate >= today && caseDate <= weekFromNow;
    }).length
  };

  // Calculate calendar summary
  const casesByDate = calendarCases.reduce((acc: Record<string, { count: number; green: number; yellow: number; red: number; gray: number }>, c) => {
    if (!acc[c.surgery_date]) {
      acc[c.surgery_date] = { count: 0, green: 0, yellow: 0, red: 0, gray: 0 };
    }
    acc[c.surgery_date].count++;
    if (c.traffic_light_status === 'green') acc[c.surgery_date].green++;
    else if (c.traffic_light_status === 'yellow') acc[c.surgery_date].yellow++;
    else if (c.traffic_light_status === 'red') acc[c.surgery_date].red++;
    else acc[c.surgery_date].gray++;
    return acc;
  }, {});

  const calendarSummary: CalendarSummary = {
    total_cases: calendarCases.length,
    total_days: Object.keys(casesByDate).length,
    green_cases: calendarCases.filter(c => c.traffic_light_status === 'green').length,
    yellow_cases: calendarCases.filter(c => c.traffic_light_status === 'yellow').length,
    red_cases: calendarCases.filter(c => c.traffic_light_status === 'red').length,
    gray_cases: calendarCases.filter(c => c.traffic_light_status === 'gray').length,
    cases_by_date: Object.entries(casesByDate).map(([date, data]) => ({
      date,
      count: data.count,
      green: data.green,
      yellow: data.yellow,
      red: data.red,
      gray: data.gray
    })).sort((a, b) => a.date.localeCompare(b.date)),
    treatment_types: []
  };

  // Get new cases (cases without reservations)
  const newCases: NewCase[] = calendarCases
    .filter(c => c.reservation_count === 0 && c.status === 'scheduled')
    .map(c => ({
      case_id: c.case_id,
      patient_name: c.patient_name,
      patient_hn: c.patient_hn,
      surgery_date: c.surgery_date,
      surgery_time: c.surgery_time,
      treatment_type: c.treatment_type,
      tooth_number: c.tooth_number,
      assigned_at: c.surgery_date,
      days_until_surgery: Math.ceil((new Date(c.surgery_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      has_reservation: false
    }))
    .slice(0, 10);

  // Get action required cases
  const actionCases: ActionCase[] = calendarCases
    .filter(c => c.traffic_light_status === 'gray' || c.traffic_light_status === 'red' || c.traffic_light_status === 'yellow')
    .map(c => {
      let actionType = 'no_reservation';
      let actionDescription = 'ยังไม่ได้จองวัสดุ - กรุณาจองวัสดุ';
      
      if (c.traffic_light_status === 'red') {
        actionType = 'material_shortage';
        actionDescription = 'วัสดุไม่เพียงพอ - ต้องรอของเข้าหรือสั่งซื้อ';
      } else if (c.traffic_light_status === 'yellow') {
        actionType = 'waiting_material';
        actionDescription = 'รอวัสดุเข้า - มี PO ที่กำลังจัดส่ง';
      }

      const daysUntil = Math.ceil((new Date(c.surgery_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let priority = 'low';
      if (daysUntil <= 2) priority = 'high';
      else if (daysUntil <= 7) priority = 'medium';

      return {
        case_id: c.case_id,
        patient_name: c.patient_name,
        surgery_date: c.surgery_date,
        action_type: actionType,
        action_description: actionDescription,
        priority,
        traffic_light: c.traffic_light_status
      };
    })
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
    })
    .slice(0, 10);

  const initialData = {
    user: { id: user.id, email: user.email },
    stats,
    newCases,
    actionCases,
    calendarCases,
    frequentProducts: [] as FrequentProduct[],
    performance: null as Performance | null,
    calendarSummary,
    startDate,
    endDate
  };

  return (
    <Suspense fallback={<DentistDashboardSkeleton />}>
      <DentistDashboardClient initialData={initialData} />
    </Suspense>
  );
}
