import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Mock data for initial build (replace with Supabase query after DB setup)
type StockItem = {
  id: string
  quantity: number
  reserved_quantity: number
  product: {
    id: string
    name: string
    ref_code: string
    reorder_point: number
  } | null
}

export async function AlertsPanel() {
  // TODO: Replace with actual Supabase query after database setup
  // const supabase = await createClient()
  // const { data: stockItems } = await supabase.from('stock_items').select(...)

  const stockItems: StockItem[] = []

  // Filter for low stock
  const lowStockItems = stockItems.filter((item) => {
    const available = item.quantity - item.reserved_quantity
    const reorderPoint = item.product?.reorder_point || 5
    return available <= reorderPoint
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">เลือกวันในปฏิทิน</h3>
        <p className="text-sm text-slate-500 mt-1">กดที่วันเพื่อดูรายละเอียด</p>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-slate-500 text-sm text-center py-8">
          เลือกวันจากปฏิทินเพื่อดูเคส
        </p>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="font-medium text-slate-900">รายการที่ใกล้หมด</h4>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => {
              const product = item.product as { name: string; ref_code: string } | null
              const available = item.quantity - item.reserved_quantity
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 bg-amber-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {product?.name}
                    </p>
                    <p className="text-xs text-slate-500">{product?.ref_code}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600 tabular-nums">
                    {available}/{item.quantity}
                  </span>
                </div>
              )
            })}
          </div>
          <Link
            href="/inventory?filter=low"
            className="flex items-center justify-center gap-1 mt-3 text-sm text-indigo-600 hover:text-indigo-700"
          >
            ดูเคสทั้งหมด
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
