'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Plus, Trash2, Check, AlertCircle, Send, Loader2 } from 'lucide-react'

interface LineSettings {
  id: string
  channel_access_token: string | null
  channel_secret: string | null
  message_templates: {
    urgent_order: string
    normal_order: string
    order_reminder: string
  }
  auto_send_urgent: boolean
  auto_send_normal: boolean
}

interface SupplierLineContact {
  id: string
  supplier_id: string
  line_user_id: string | null
  line_display_name: string | null
  contact_type: string
  is_active: boolean
  verified: boolean
  notes: string | null
  supplier: {
    name: string
    code: string
  }
}

export function LineSettingsPanel() {
  const [settings, setSettings] = useState<LineSettings | null>(null)
  const [contacts, setContacts] = useState<SupplierLineContact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'api' | 'contacts' | 'templates'>('api')
  const [showSuccess, setShowSuccess] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
    fetchContacts()
  }, [])

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('line_settings')
      .select('*')
      .single()

    if (data) {
      setSettings(data)
    }
    setLoading(false)
  }

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('supplier_line_contacts')
      .select(`
        *,
        supplier:suppliers (
          name,
          code
        )
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setContacts(data as any)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    const { error } = await supabase
      .from('line_settings')
      .update({
        channel_access_token: settings.channel_access_token,
        channel_secret: settings.channel_secret,
        message_templates: settings.message_templates,
        auto_send_urgent: settings.auto_send_urgent,
        auto_send_normal: settings.auto_send_normal,
        updated_at: new Date().toISOString()
      } as never)
      .eq('id', settings.id)

    setSaving(false)
    
    if (!error) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }

  const handleTestMessage = async () => {
    setTestSending(true)
    // Simulate sending test message
    await new Promise(resolve => setTimeout(resolve, 2000))
    setTestSending(false)
    alert('ส่งข้อความทดสอบสำเร็จ! (ในระบบจริงจะเชื่อมกับ LINE Messaging API)')
  }

  const handleAddContact = async () => {
    const supplierName = prompt('ชื่อ Supplier:')
    const lineUserId = prompt('LINE User ID:')
    
    if (supplierName && lineUserId) {
      // In real implementation, would need to select from suppliers table
      alert('เพิ่ม LINE Contact สำเร็จ! (ในระบบจริงจะเลือกจาก Supplier ที่มีอยู่)')
      fetchContacts()
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (confirm('ต้องการลบ LINE Contact นี้?')) {
      const { error } = await supabase
        .from('supplier_line_contacts')
        .delete()
        .eq('id', id)

      if (!error) {
        fetchContacts()
      }
    }
  }

  const handleToggleContact = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('supplier_line_contacts')
      .update({ is_active: !isActive } as never)
      .eq('id', id)

    if (!error) {
      fetchContacts()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-slate-500">
        ไม่พบการตั้งค่า LINE
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">LINE Messaging API</h2>
            <p className="text-sm text-slate-500">ตั้งค่าการส่งข้อความสั่งซื้อผ่าน LINE</p>
          </div>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">บันทึกสำเร็จ</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'api'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            API Settings
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'contacts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Supplier Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Message Templates
          </button>
        </div>
      </div>

      {/* API Settings Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">วิธีการตั้งค่า LINE Messaging API</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>สร้าง LINE Official Account ที่ <a href="https://manager.line.biz" target="_blank" className="underline">LINE Business</a></li>
                  <li>ไปที่ Messaging API settings</li>
                  <li>คัดลอก Channel Access Token และ Channel Secret มาใส่ด้านล่าง</li>
                  <li>เพิ่ม Webhook URL (ถ้าต้องการรับข้อความตอบกลับ)</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Channel Access Token
              </label>
              <input
                type="password"
                value={settings.channel_access_token || ''}
                onChange={(e) => setSettings({ ...settings, channel_access_token: e.target.value })}
                placeholder="ใส่ Channel Access Token"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Channel Secret
              </label>
              <input
                type="password"
                value={settings.channel_secret || ''}
                onChange={(e) => setSettings({ ...settings, channel_secret: e.target.value })}
                placeholder="ใส่ Channel Secret"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-medium text-slate-900 mb-3">การส่งอัตโนมัติ</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">ส่งอัตโนมัติสำหรับคำสั่งซื้อด่วน</span>
                  <input
                    type="checkbox"
                    checked={settings.auto_send_urgent}
                    onChange={(e) => setSettings({ ...settings, auto_send_urgent: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">ส่งอัตโนมัติสำหรับคำสั่งซื้อปกติ</span>
                  <input
                    type="checkbox"
                    checked={settings.auto_send_normal}
                    onChange={(e) => setSettings({ ...settings, auto_send_normal: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    บันทึกการตั้งค่า
                  </>
                )}
              </button>
              <button
                onClick={handleTestMessage}
                disabled={testSending || !settings.channel_access_token}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {testSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    ทดสอบส่งข้อความ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              จัดการ LINE ID ของ Supplier เพื่อส่งคำสั่งซื้อ
            </p>
            <button
              onClick={handleAddContact}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              เพิ่ม Contact
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                ยังไม่มี LINE Contact
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Supplier</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">LINE Display Name</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">LINE User ID</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">ประเภท</th>
                    <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">สถานะ</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{contact.supplier.name}</p>
                          <p className="text-xs text-slate-500">{contact.supplier.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{contact.line_display_name || '-'}</td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {contact.line_user_id || '-'}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          contact.contact_type === 'primary'
                            ? 'bg-indigo-100 text-indigo-700'
                            : contact.contact_type === 'urgent'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {contact.contact_type === 'primary' ? 'หลัก' : contact.contact_type === 'urgent' ? 'ด่วน' : 'รอง'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contact.is_active}
                            onChange={() => handleToggleContact(contact.id, contact.is_active)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Message Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            กำหนดรูปแบบข้อความที่จะส่งไปยัง Supplier ผ่าน LINE
          </p>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-medium text-slate-900 mb-3">คำสั่งซื้อด่วน (Urgent Order)</h4>
              <textarea
                value={settings.message_templates.urgent_order}
                onChange={(e) => setSettings({
                  ...settings,
                  message_templates: {
                    ...settings.message_templates,
                    urgent_order: e.target.value
                  }
                })}
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                ตัวแปรที่ใช้ได้: {'{po_number}'}, {'{items}'}, {'{delivery_date}'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-medium text-slate-900 mb-3">คำสั่งซื้อปกติ (Normal Order)</h4>
              <textarea
                value={settings.message_templates.normal_order}
                onChange={(e) => setSettings({
                  ...settings,
                  message_templates: {
                    ...settings.message_templates,
                    normal_order: e.target.value
                  }
                })}
                rows={6}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                ตัวแปรที่ใช้ได้: {'{po_number}'}, {'{items}'}, {'{delivery_date}'}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h4 className="font-medium text-slate-900 mb-3">แจ้งเตือนคำสั่งซื้อ (Order Reminder)</h4>
              <textarea
                value={settings.message_templates.order_reminder}
                onChange={(e) => setSettings({
                  ...settings,
                  message_templates: {
                    ...settings.message_templates,
                    order_reminder: e.target.value
                  }
                })}
                rows={5}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                ตัวแปรที่ใช้ได้: {'{po_number}'}, {'{delivery_date}'}
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    บันทึก Templates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
