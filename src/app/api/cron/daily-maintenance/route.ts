import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Vercel Cron Job - Daily Maintenance
// Schedule: 23:00 UTC (06:00 UTC+7 Thailand)
// This runs all daily maintenance tasks in a single cron job

export const runtime = 'edge';
export const maxDuration = 60; // 60 seconds max for edge functions

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  
  try {
    // Create Supabase client with service role for full access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Run the master daily maintenance function
    const { data, error } = await supabase.rpc('run_daily_maintenance');

    if (error) {
      console.error('Daily maintenance error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          executed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        },
        { status: 500 }
      );
    }

    // Log success
    console.log('Daily maintenance completed:', data);

    return NextResponse.json({
      success: true,
      data,
      executed_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime
    });

  } catch (error) {
    console.error('Daily maintenance exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers from admin panel
export async function POST(request: NextRequest) {
  // For manual triggers, verify admin authentication
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', user.id)
      .single();

    if (userError || (userData?.role as any)?.name !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Run maintenance
    const { data, error } = await supabase.rpc('run_daily_maintenance');

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      triggered_by: user.email,
      executed_at: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
