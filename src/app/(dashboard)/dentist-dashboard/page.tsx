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

  const initialData = {
    user: { id: user.id, email: user.email },
    stats: statsResult.data || null,
    newCases: newCasesResult.data || [],
    actionCases: actionCasesResult.data || [],
    calendarCases: calendarResult.data || [],
    frequentProducts: frequentResult.data || [],
    performance: performanceResult.data || null,
    calendarSummary: summaryResult.data || null,
    startDate,
    endDate
  };

  return (
    <Suspense fallback={<DentistDashboardSkeleton />}>
      <DentistDashboardClient initialData={initialData} />
    </Suspense>
  );
}
