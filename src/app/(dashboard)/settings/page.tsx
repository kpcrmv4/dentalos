'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, User, Building2, Bell, Shield, Database, Palette, Save, Check } from 'lucide-react'
import { Modal, Button, FormField, Input, Select, Textarea } from '@/components/ui/modal'

const settingsSections = [
  {
    id: 'profile',
    icon: User,
    title: 'โปรไฟล์',
    description: 'จัดการข้อมูลส่วนตัวและรหัสผ่าน',
  },
  {
    id: 'clinic',
    icon: Building2,
    title: 'คลินิก',
    description: 'ข้อมูลคลินิก, สาขา, และเวลาทำการ',
  },
  {
    id: 'users',
    icon: Shield,
    title: 'ผู้ใช้งานและสิทธิ์',
    description: 'จัดการผู้ใช้งาน, บทบาท, และสิทธิ์การเข้าถึง',
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'การแจ้งเตือน',
    description: 'ตั้งค่าการแจ้งเตือนและอีเมล',
  },
  {
    id: 'master-data',
    icon: Database,
    title: 'ข้อมูลหลัก',
    description: 'หมวดหมู่สินค้า, Supplier, และการตั้งค่าสต็อก',
  },
  {
    id: 'appearance',
    icon: Palette,
    title: 'ธีมและการแสดงผล',
    description: 'ปรับแต่งรูปลักษณ์และภาษา',
  },
]

// Profile Modal Form
function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    fullName: 'Admin User',
    email: 'admin@dentalflow.com',
    phone: '081-234-5678',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('บันทึกข้อมูลโปรไฟล์สำเร็จ!')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขโปรไฟล์" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="ชื่อ-นามสกุล" required>
          <Input
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="ชื่อ-นามสกุล"
          />
        </FormField>

        <FormField label="อีเมล" required>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
        </FormField>

        <FormField label="เบอร์โทรศัพท์">
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0xx-xxx-xxxx"
          />
        </FormField>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <h4 className="font-medium text-slate-900 mb-4">เปลี่ยนรหัสผ่าน</h4>
          <div className="space-y-4">
            <FormField label="รหัสผ่านปัจจุบัน">
              <Input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                placeholder="รหัสผ่านปัจจุบัน"
              />
            </FormField>
            <FormField label="รหัสผ่านใหม่">
              <Input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="รหัสผ่านใหม่"
              />
            </FormField>
            <FormField label="ยืนยันรหัสผ่านใหม่">
              <Input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="ยืนยันรหัสผ่านใหม่"
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// Clinic Modal Form
function ClinicModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    clinicName: 'DentalFlow Clinic',
    address: '123/45 ถนนสุขุมวิท แขวงคลองตัน เขตวัฒนา กรุงเทพฯ 10110',
    phone: '02-123-4567',
    email: 'contact@dentalflow.com',
    openTime: '09:00',
    closeTime: '18:00',
    workDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('บันทึกข้อมูลคลินิกสำเร็จ!')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลคลินิก" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="ชื่อคลินิก" required>
          <Input
            value={formData.clinicName}
            onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
            placeholder="ชื่อคลินิก"
          />
        </FormField>

        <FormField label="ที่อยู่" required>
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="ที่อยู่คลินิก"
            rows={2}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="เบอร์โทรศัพท์">
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="02-xxx-xxxx"
            />
          </FormField>
          <FormField label="อีเมล">
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@clinic.com"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="เวลาเปิด">
            <Input
              type="time"
              value={formData.openTime}
              onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
            />
          </FormField>
          <FormField label="เวลาปิด">
            <Input
              type="time"
              value={formData.closeTime}
              onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
            />
          </FormField>
        </div>

        <FormField label="วันทำการ">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'mon', label: 'จ.' },
              { value: 'tue', label: 'อ.' },
              { value: 'wed', label: 'พ.' },
              { value: 'thu', label: 'พฤ.' },
              { value: 'fri', label: 'ศ.' },
              { value: 'sat', label: 'ส.' },
              { value: 'sun', label: 'อา.' },
            ].map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  const workDays = formData.workDays.includes(day.value)
                    ? formData.workDays.filter((d) => d !== day.value)
                    : [...formData.workDays, day.value]
                  setFormData({ ...formData, workDays })
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  formData.workDays.includes(day.value)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// Users Modal
function UsersModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const mockUsers = [
    { id: '1', name: 'Admin User', email: 'admin@dentalflow.com', role: 'Admin' },
    { id: '2', name: 'ทพ.วิชัย สุขสันต์', email: 'wichai@dentalflow.com', role: 'Dentist' },
    { id: '3', name: 'ผู้ช่วยมาลี', email: 'malee@dentalflow.com', role: 'Assistant' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="จัดการผู้ใช้งาน" size="lg">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">ผู้ใช้งานทั้งหมด {mockUsers.length} คน</p>
          <Button onClick={() => alert('เพิ่มผู้ใช้งานใหม่')}>เพิ่มผู้ใช้งาน</Button>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ชื่อ</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">อีเมล</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">บทบาท</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => alert(`แก้ไขข้อมูล: ${user.name}`)}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
          <Button variant="secondary" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Notifications Settings Modal
function NotificationsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState({
    lowStock: true,
    expiring: true,
    caseReminder: true,
    dailySummary: false,
    emailNotif: false,
    lineNotif: true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('บันทึกการตั้งค่าแจ้งเตือนสำเร็จ!')
    onClose()
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
    </label>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าการแจ้งเตือน" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-1">
        <div className="divide-y divide-slate-200">
          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">สินค้าใกล้หมด</p>
              <p className="text-sm text-slate-500">แจ้งเตือนเมื่อสินค้าเหลือน้อยกว่าจุดสั่งซื้อ</p>
            </div>
            <Toggle checked={settings.lowStock} onChange={(val) => setSettings({ ...settings, lowStock: val })} />
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">สินค้าใกล้หมดอายุ</p>
              <p className="text-sm text-slate-500">แจ้งเตือนก่อนสินค้าหมดอายุ 60 วัน</p>
            </div>
            <Toggle checked={settings.expiring} onChange={(val) => setSettings({ ...settings, expiring: val })} />
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">เตือนเคสที่นัดหมาย</p>
              <p className="text-sm text-slate-500">แจ้งเตือนเคสที่นัดหมายล่วงหน้า 1 วัน</p>
            </div>
            <Toggle
              checked={settings.caseReminder}
              onChange={(val) => setSettings({ ...settings, caseReminder: val })}
            />
          </div>

          <div className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">สรุปรายวัน</p>
              <p className="text-sm text-slate-500">ส่งสรุปรายวันทุกเช้า</p>
            </div>
            <Toggle
              checked={settings.dailySummary}
              onChange={(val) => setSettings({ ...settings, dailySummary: val })}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 mt-4">
          <h4 className="font-medium text-slate-900 mb-4">ช่องทางแจ้งเตือน</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">อีเมล</p>
                <p className="text-sm text-slate-500">ส่งการแจ้งเตือนทางอีเมล</p>
              </div>
              <Toggle checked={settings.emailNotif} onChange={(val) => setSettings({ ...settings, emailNotif: val })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">LINE Notify</p>
                <p className="text-sm text-slate-500">ส่งการแจ้งเตือนผ่าน LINE</p>
              </div>
              <Toggle checked={settings.lineNotif} onChange={(val) => setSettings({ ...settings, lineNotif: val })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

// Master Data Modal
function MasterDataModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'categories' | 'suppliers'>('categories')

  const mockCategories = [
    { id: '1', name: 'Implant', count: 45 },
    { id: '2', name: 'Abutment', count: 32 },
    { id: '3', name: 'Bone Graft', count: 18 },
    { id: '4', name: 'Membrane', count: 12 },
  ]

  const mockSuppliers = [
    { id: '1', name: 'Straumann Thailand', contact: '02-111-2222' },
    { id: '2', name: 'Nobel Biocare Thailand', contact: '02-333-4444' },
    { id: '3', name: 'Osstem Thailand', contact: '02-555-6666' },
    { id: '4', name: 'Geistlich Pharma', contact: '02-777-8888' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลหลัก" size="lg">
      <div className="p-6">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            หมวดหมู่สินค้า
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'suppliers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Supplier
          </button>
        </div>

        {activeTab === 'categories' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">หมวดหมู่ทั้งหมด {mockCategories.length} รายการ</p>
              <Button onClick={() => alert('เพิ่มหมวดหมู่ใหม่')}>เพิ่มหมวดหมู่</Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ชื่อหมวดหมู่</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">จำนวนสินค้า</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {mockCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{cat.count}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => alert(`แก้ไข: ${cat.name}`)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'suppliers' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">Supplier ทั้งหมด {mockSuppliers.length} ราย</p>
              <Button onClick={() => alert('เพิ่ม Supplier ใหม่')}>เพิ่ม Supplier</Button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">ชื่อ Supplier</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">เบอร์ติดต่อ</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {mockSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{sup.name}</td>
                      <td className="px-4 py-3 text-slate-600">{sup.contact}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => alert(`แก้ไข: ${sup.name}`)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          แก้ไข
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
          <Button variant="secondary" onClick={onClose}>
            ปิด
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Appearance Modal
function AppearanceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [settings, setSettings] = useState({
    theme: 'light',
    language: 'th',
    dateFormat: 'dd/MM/yyyy',
    fontSize: 'medium',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('บันทึกการตั้งค่าการแสดงผลสำเร็จ!')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ธีมและการแสดงผล" size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="ธีม">
          <div className="flex gap-4">
            {[
              { value: 'light', label: 'สว่าง', icon: '☀️' },
              { value: 'dark', label: 'มืด', icon: '🌙' },
              { value: 'system', label: 'ตามระบบ', icon: '💻' },
            ].map((theme) => (
              <button
                key={theme.value}
                type="button"
                onClick={() => setSettings({ ...settings, theme: theme.value })}
                className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                  settings.theme === theme.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-2xl block mb-1">{theme.icon}</span>
                <span className="text-sm font-medium text-slate-900">{theme.label}</span>
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="ภาษา">
          <Select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
          >
            <option value="th">ไทย</option>
            <option value="en">English</option>
          </Select>
        </FormField>

        <FormField label="รูปแบบวันที่">
          <Select
            value={settings.dateFormat}
            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
          >
            <option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2569)</option>
            <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2026)</option>
            <option value="yyyy-MM-dd">YYYY-MM-DD (2026-12-31)</option>
          </Select>
        </FormField>

        <FormField label="ขนาดตัวอักษร">
          <Select
            value={settings.fontSize}
            onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
          >
            <option value="small">เล็ก</option>
            <option value="medium">ปกติ</option>
            <option value="large">ใหญ่</option>
          </Select>
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="secondary" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function SettingsPage() {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [quickSettings, setQuickSettings] = useState({
    lowStockAlert: true,
    expiryDays: '60',
    emailNotif: false,
    autoBackup: true,
  })
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleQuickSettingChange = (key: string, value: string | boolean) => {
    setQuickSettings({ ...quickSettings, [key]: value })
    setSaveStatus('บันทึกการตั้งค่าเรียบร้อย')
    setTimeout(() => setSaveStatus(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h1>
          <p className="text-slate-500 mt-1">จัดการการตั้งค่าและปรับแต่งระบบ</p>
        </div>
        {saveStatus && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        {settingsSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setOpenModal(section.id)}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer text-left"
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
          </button>
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
              <input
                type="checkbox"
                checked={quickSettings.lowStockAlert}
                onChange={(e) => handleQuickSettingChange('lowStockAlert', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Expiry Alert Days */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">แจ้งเตือนสินค้าใกล้หมดอายุ</p>
              <p className="text-sm text-slate-500">แจ้งเตือนก่อนหมดอายุกี่วัน</p>
            </div>
            <select
              value={quickSettings.expiryDays}
              onChange={(e) => handleQuickSettingChange('expiryDays', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
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
              <input
                type="checkbox"
                checked={quickSettings.emailNotif}
                onChange={(e) => handleQuickSettingChange('emailNotif', e.target.checked)}
                className="sr-only peer"
              />
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
              <input
                type="checkbox"
                checked={quickSettings.autoBackup}
                onChange={(e) => handleQuickSettingChange('autoBackup', e.target.checked)}
                className="sr-only peer"
              />
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

      {/* Modals */}
      <ProfileModal isOpen={openModal === 'profile'} onClose={() => setOpenModal(null)} />
      <ClinicModal isOpen={openModal === 'clinic'} onClose={() => setOpenModal(null)} />
      <UsersModal isOpen={openModal === 'users'} onClose={() => setOpenModal(null)} />
      <NotificationsModal isOpen={openModal === 'notifications'} onClose={() => setOpenModal(null)} />
      <MasterDataModal isOpen={openModal === 'master-data'} onClose={() => setOpenModal(null)} />
      <AppearanceModal isOpen={openModal === 'appearance'} onClose={() => setOpenModal(null)} />
    </div>
  )
}
