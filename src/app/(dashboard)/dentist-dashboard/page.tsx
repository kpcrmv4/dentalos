import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { DentistDashboardClient } from './client';
import { DentistDashboardSkeleton } from './loading';

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

  // Fetch initial data in parallel on server
  // Use type assertion to bypass strict type checking for RPC calls
  const rpcClient = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> };
  const [
    statsResult,
    newCasesResult,
    actionCasesResult,
    calendarResult,
    frequentResult,
    performanceResult,
    summaryResult
  ] = await Promise.all([
    rpcClient.rpc('get_dentist_stats', { 
      p_dentist_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    }),
    rpcClient.rpc('get_new_assigned_cases', { 
      p_dentist_id: user.id,
      p_limit: 10
    }),
    rpcClient.rpc('get_action_required_cases', { 
      p_dentist_id: user.id,
      p_limit: 10
    }),
    rpcClient.rpc('get_dentist_cases_calendar', { 
      p_dentist_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    }),
    rpcClient.rpc('get_frequently_used_products', { 
      p_dentist_id: user.id,
      p_limit: 5,
      p_months: 6
    }),
    rpcClient.rpc('get_dentist_performance', { 
      p_dentist_id: user.id
    }),
    rpcClient.rpc('get_calendar_summary', { 
      p_dentist_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    })
  ]);

  // Type definitions for casting
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
    cases_by_date: Array<{ date: string; count: number; green: number; yellow: number; red: number; }>;
    treatment_types: Array<{ type: string; count: number; }>;
  };

  const initialData = {
    user: { id: user.id, email: user.email },
    stats: (statsResult.data || null) as DentistStats | null,
    newCases: (newCasesResult.data || []) as NewCase[],
    actionCases: (actionCasesResult.data || []) as ActionCase[],
    calendarCases: (calendarResult.data || []) as CalendarCase[],
    frequentProducts: (frequentResult.data || []) as FrequentProduct[],
    performance: (performanceResult.data || null) as Performance | null,
    calendarSummary: (summaryResult.data || null) as CalendarSummary | null,
    startDate,
    endDate
  };

  return (
    <Suspense fallback={<DentistDashboardSkeleton />}>
      <DentistDashboardClient initialData={initialData} />
    </Suspense>
  );
}
