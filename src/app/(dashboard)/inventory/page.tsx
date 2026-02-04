import { Suspense } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { InventoryClient } from './client';
import { InventorySkeleton } from './loading';

// Server Component - Fetches initial data
export default async function InventoryPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Fetch initial data in parallel on server
  const [inventoryResult, oosResult] = await Promise.all([
    supabase
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
      .order('expiry_date', { ascending: true }),
    supabase.rpc('get_pending_oos_requests')
  ]);

  // Calculate stats from inventory data
  const inventory = (inventoryResult.data || []) as any[];
  let normal = 0, low = 0, expiring = 0;
  
  inventory.forEach(item => {
    const available = item.quantity - item.reserved_quantity;
    const expiryDate = new Date(item.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (available <= 0) return;
    if (daysUntilExpiry <= 90) expiring++;
    else if (available <= item.product.reorder_point) low++;
    else normal++;
  });

  const initialData = {
    inventory,
    stats: {
      total: inventory.length,
      normal,
      low,
      expiring
    },
    oosRequests: oosResult.data || [],
    dashboardStats: {
      total_value: 2450000,
      items_received_today: 12,
      items_used_today: 8,
      turnover_rate: 15.5,
      pending_oos_requests: (oosResult.data || []).length
    }
  };

  return (
    <Suspense fallback={<InventorySkeleton />}>
      <InventoryClient initialData={initialData} />
    </Suspense>
  );
}
