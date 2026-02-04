import { Settings, User, Building2, Bell, Shield, Database, Palette } from 'lucide-react'

const settingsSections = [
  {
    icon: User,
    title: 'โปรไฟล์',
    description: 'จัดการข้อมูลส่วนตัวและรหัสผ่าน',
    href: '/settings/profile',
  },
  {
    icon: Building2,
    title: 'คลินิก',
    description: 'ข้อมูลคลินิก, สาขา, และเวลาทำการ',
    href: '/settings/clinic',
  },
  {
    icon: Shield,
    title: 'ผู้ใช้งานและสิทธิ์',
    description: 'จัดการผู้ใช้งาน, บทบาท, และสิทธิ์การเข้าถึง',
    href: '/settings/users',
  },
  {
    icon: Bell,
    title: 'การแจ้งเตือน',
    description: 'ตั้งค่าการแจ้งเตือนและอีเมล',
    href: '/settings/notifications',
  },
  {
    icon: Database,
    title: 'ข้อมูลหลัก',
    description: 'หมวดหมู่สินค้า, Supplier, และการตั้งค่าสต็อก',
    href: '/settings/master-data',
  },
  {
    icon: Palette,
    title: 'ธีมและการแสดงผล',
    description: 'ปรับแต่งรูปลักษณ์และภาษา',
    href: '/settings/appearance',
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
        <p className="text-slate-500 mt-1">จัดการการตั้งค่าและปรับแต่งระบบ</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        {settingsSections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                <section.icon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{section.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{section.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">การตั้งค่าด่วน</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {/* Low Stock Alert Threshold */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">แจ้งเตือนสินค้าใกล้หมด</p>
              <p className="text-sm text-slate-500">แจ้งเตือนเมื่อสินค้าเหลือน้อยกว่าจุดสั่งซื้อ</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Expiry Alert Days */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">แจ้งเตือนสินค้าใกล้หมดอายุ</p>
              <p className="text-sm text-slate-500">แจ้งเตือนก่อนหมดอายุกี่วัน</p>
            </div>
            <select className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="30">30 วัน</option>
              <option value="60">60 วัน</option>
              <option value="90">90 วัน</option>
            </select>
          </div>

          {/* Email Notifications */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">แจ้งเตือนทางอีเมล</p>
              <p className="text-sm text-slate-500">ส่งสรุปรายวันทางอีเมล</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Auto Backup */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">สำรองข้อมูลอัตโนมัติ</p>
              <p className="text-sm text-slate-500">สำรองข้อมูลทุกวันตอนเที่ยงคืน</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">ข้อมูลระบบ</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">เวอร์ชัน</p>
            <p className="font-medium text-slate-900">1.0.0</p>
          </div>
          <div>
            <p className="text-slate-500">อัพเดทล่าสุด</p>
            <p className="font-medium text-slate-900">4 ก.พ. 2569</p>
          </div>
          <div>
            <p className="text-slate-500">สถานะ Database</p>
            <p className="font-medium text-emerald-600">เชื่อมต่อแล้ว</p>
          </div>
        </div>
      </div>
    </div>
  )
}
