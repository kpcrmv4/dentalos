import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายงาน</h1>
          <p className="text-slate-500 mt-1">วิเคราะห์ข้อมูลและสร้างรายงาน</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="this_month">เดือนนี้</option>
            <option value="last_month">เดือนที่แล้ว</option>
            <option value="this_quarter">ไตรมาสนี้</option>
            <option value="this_year">ปีนี้</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">เคสทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">45</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+12%</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">มูลค่าสต็อก</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">2.4M</p>
            </div>
            <div className="flex items-center gap-1 text-red-600">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">-3%</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">ใช้วัสดุ (ชิ้น)</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">128</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+8%</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">สั่งซื้อ</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">850K</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">+15%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cases by Dentist */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">เคสแยกตามทันตแพทย์</h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              { name: 'ทพ.วิชัย สุขสวัสดิ์', cases: 18, percentage: 40 },
              { name: 'ทพ.สมหญิง รักษาดี', cases: 15, percentage: 33 },
              { name: 'ทพ.ประสิทธิ์ มานะ', cases: 12, percentage: 27 },
            ].map((dentist) => (
              <div key={dentist.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{dentist.name}</span>
                  <span className="text-sm font-medium text-slate-900">{dentist.cases} เคส</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${dentist.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products Used */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">สินค้าที่ใช้มากที่สุด</h3>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 pb-2">สินค้า</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2">จำนวน</th>
                  <th className="text-right text-xs font-medium text-slate-500 pb-2">มูลค่า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: 'Straumann BLT 4.1x10', qty: 25, value: 375000 },
                  { name: 'Bio-Oss 0.5g', qty: 42, value: 210000 },
                  { name: 'Nobel Active 3.5x10', qty: 18, value: 270000 },
                  { name: 'Osstem TS III 4.0x12', qty: 22, value: 132000 },
                ].map((product) => (
                  <tr key={product.name}>
                    <td className="py-2 text-sm text-slate-900">{product.name}</td>
                    <td className="py-2 text-sm text-right text-slate-600">{product.qty}</td>
                    <td className="py-2 text-sm text-right font-medium text-slate-900">
                      {product.value.toLocaleString('th-TH')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">แนวโน้มเคสรายเดือน</h3>
          </div>
          <div className="p-4">
            <div className="flex items-end justify-between h-40 gap-2">
              {[
                { month: 'ก.ย.', value: 30 },
                { month: 'ต.ค.', value: 42 },
                { month: 'พ.ย.', value: 38 },
                { month: 'ธ.ค.', value: 35 },
                { month: 'ม.ค.', value: 48 },
                { month: 'ก.พ.', value: 45 },
              ].map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-indigo-500 rounded-t"
                    style={{ height: `${(item.value / 50) * 100}%` }}
                  />
                  <span className="text-xs text-slate-500">{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Value by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">มูลค่าสต็อกแยกหมวดหมู่</h3>
          </div>
          <div className="p-4 space-y-4">
            {[
              { name: 'Implant', value: 1500000, percentage: 62 },
              { name: 'Bone Graft', value: 450000, percentage: 19 },
              { name: 'Abutment', value: 280000, percentage: 12 },
              { name: 'Membrane', value: 170000, percentage: 7 },
            ].map((category) => (
              <div key={category.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">{category.name}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {(category.value / 1000000).toFixed(2)}M ฿
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">รายงานด่วน</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Package, label: 'สินค้าใกล้หมด', description: '8 รายการ' },
            { icon: Calendar, label: 'ใกล้หมดอายุ', description: '6 รายการ (30 วัน)' },
            { icon: DollarSign, label: 'มูลค่าสั่งซื้อ', description: 'เดือนนี้ 850,000 ฿' },
            { icon: BarChart3, label: 'Supplier Performance', description: 'คะแนนเฉลี่ย 4.2/5' },
          ].map((report) => (
            <button
              key={report.label}
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
    </div>
  )
}
